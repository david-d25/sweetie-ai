package space.davids_digital.sweetie.integration.openai

import com.aallam.openai.api.audio.SpeechRequest
import com.aallam.openai.api.audio.SpeechResponseFormat
import com.aallam.openai.api.audio.TranscriptionRequest
import com.aallam.openai.api.audio.Voice
import com.aallam.openai.api.file.FileSource
import com.aallam.openai.api.http.Timeout
import com.aallam.openai.api.logging.LogLevel
import com.aallam.openai.api.model.ModelId
import com.aallam.openai.client.LoggingConfig
import com.aallam.openai.client.OpenAI
import com.aallam.openai.client.RetryStrategy
import com.knuddels.jtokkit.Encodings
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.*
import io.ktor.client.request.forms.MultiPartFormDataContent
import io.ktor.client.request.forms.formData
import io.ktor.client.request.forms.submitFormWithBinaryData
import io.ktor.http.*
import io.ktor.http.content.ByteArrayContent
import okio.source
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.cache.annotation.Cacheable
import org.springframework.stereotype.Service
import space.davids_digital.sweetie.integration.openai.dto.*
import java.io.ByteArrayOutputStream
import kotlin.time.Duration.Companion.minutes

@Service
class OpenAiService(
    @Qualifier("openaiSecretKey")
    private val openaiSecretKey: String,
    private val httpClient: HttpClient
) {
    companion object {
        private val log = LoggerFactory.getLogger(OpenAiService::class.java)
    }

    private val client: OpenAI = OpenAI(
        token = openaiSecretKey,
        logging = LoggingConfig(logLevel = LogLevel.None),
        timeout = Timeout(15.minutes, 15.minutes, 15.minutes),
        retry = RetryStrategy(maxRetries = 5)
    )

    private val registry = Encodings.newDefaultEncodingRegistry()

    @Cacheable("OpenAiService.getAvailableGptOnlyModels")
    suspend fun getAvailableGptOnlyModels(): List<String> {
        log.info("Getting available GPT models")
        return client.models().map { it.id.id }.filter {
            it.startsWith("gpt") || it.startsWith("ft:gpt") || it.startsWith("o")
        }
    }

    fun estimateTokenCount(text: String, model: String): Int {
        val refinedModel = if (model.startsWith("ft:")) model.substring(3) else model
        val encoding = registry.getEncodingForModel(refinedModel)
        return if (encoding.isPresent) {
            encoding.get().countTokensOrdinary(text)
        } else {
            text.length
        }
    }

    suspend fun completion(
        messages: List<ChatMessage>,
        tools: List<Tool>,
        model: String,
        maxTokens: Int,
        temperature: Double?,
        topP: Double,
        frequencyPenalty: Double,
        presencePenalty: Double,
        modalities: List<String>?,
        audioVoice: String,
    ): ChatMessage {
        val audio = if (modalities?.contains("audio") == true) {
            ChatCompletionRequest.Audio(
                voice = audioVoice,
                format = "mp3"
            )
        } else {
            null
        }
        val request = ChatCompletionRequest(
            model = model,
            messages = messages,
            tools = tools.ifEmpty { null },
            temperature = temperature,
            maxCompletionTokens = maxTokens,
            topP = topP,
            modalities = modalities,
            frequencyPenalty = frequencyPenalty,
            presencePenalty = presencePenalty,
            audio = audio
        )
        val response = httpClient.post("https://api.openai.com/v1/chat/completions") {
            headers.append(HttpHeaders.Authorization, "Bearer $openaiSecretKey")
            contentType(ContentType.Application.Json)
            setBody(request)
        }
        if (!response.status.isSuccess()) {
            log.error("Failed to get completion: ${response.body<ErrorResponse>().error.message}")
            throw IllegalStateException("OpenAI API Error: ${response.status}")
        }
        return response.body<ChatCompletion>().choices.first().message
    }

    suspend fun speech(text: String, model: String, voice: String, speed: Double): ByteArray {
        return client.speech(
            SpeechRequest(
                model = ModelId(model),
                input = text,
                voice = Voice(voice),
                speed = speed,
                responseFormat = SpeechResponseFormat.Opus
            )
        )
    }

    suspend fun image(prompt: String, imagesNumber: Int, quality: String?, size: String): List<String> {
        if (size !in listOf("1024x1024", "1536x1024", "1024x1536", "auto")) {
            throw IllegalArgumentException("Size must be one of 1024x1024, 1536x1024, 1024x1536, auto, but was $size")
        }
        val request = ImageGenerationRequest(
            prompt = prompt,
            background = "auto",
            model = "gpt-image-1",
            moderation = "low",
            n = imagesNumber,
            outputFormat = "png",
            quality = quality,
            size = size,
        )
        val response = httpClient.post("https://api.openai.com/v1/images/generations") {
            headers.append(HttpHeaders.Authorization, "Bearer $openaiSecretKey")
            contentType(ContentType.Application.Json)
            setBody(request)
        }
        if (!response.status.isSuccess()) {
            val message = response.body<ErrorResponse>().error.message
            log.error("Failed to get image: $message")
            throw IllegalStateException("OpenAI API Error: $message")
        }
        return response.body<ImageGenerationResponse>().data.map { it.base64Json }
    }

    suspend fun editImage(
        images: List<ByteArray>,
        prompt: String,
        imagesNumber: Int,
        quality: String?,
        size: String
    ): List<String> {
        if (size !in listOf("1024x1024", "1536x1024", "1024x1536", "auto")) {
            throw IllegalArgumentException("Size must be one of 1024x1024, 1536x1024, 1024x1536, auto, but was $size")
        }

        val multipartContent = MultiPartFormDataContent(formData {
            images.forEachIndexed { idx, bytes ->
                append("image[]", bytes, Headers.build {
                    append(HttpHeaders.ContentType, ContentType.Image.PNG.toString())
                    append(HttpHeaders.ContentDisposition, "form-data; name=\"image[]\"; filename=\"image$idx.png\"")
                })
            }

            append("prompt", prompt)
            append("model", "gpt-image-1")
            append("n", imagesNumber.toString())
            quality?.let { append("quality", it) }
            append("size", size)
        })

        val response = httpClient.post("https://api.openai.com/v1/images/edits") {
            headers {
                append(HttpHeaders.Authorization, "Bearer $openaiSecretKey")
            }
            contentType(ContentType.MultiPart.FormData)
            setBody(multipartContent)
        }

        if (!response.status.isSuccess()) {
            val message = response.body<ErrorResponse>().error.message
            log.error("Failed to edit image: $message")
            throw IllegalStateException("OpenAI API Error: $message")
        }

        return response.body<ImageGenerationResponse>().data.map { it.base64Json }
    }

    suspend fun transcription(audio: ByteArray): String {
        return client.transcription(TranscriptionRequest(
            model = ModelId("whisper-1"),
            audio = FileSource("audio.mp3", audio.inputStream().source())
        )).text
    }
}
