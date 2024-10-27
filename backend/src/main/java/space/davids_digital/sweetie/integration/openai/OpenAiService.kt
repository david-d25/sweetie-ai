package space.davids_digital.sweetie.integration.openai

import com.aallam.openai.api.audio.SpeechRequest
import com.aallam.openai.api.audio.SpeechResponseFormat
import com.aallam.openai.api.audio.TranscriptionRequest
import com.aallam.openai.api.audio.Voice
import com.aallam.openai.api.file.FileSource
import com.aallam.openai.api.image.ImageCreation
import com.aallam.openai.api.image.ImageSize
import com.aallam.openai.api.logging.LogLevel
import com.aallam.openai.api.model.ModelId
import com.aallam.openai.client.LoggingConfig
import com.aallam.openai.client.OpenAI
import com.knuddels.jtokkit.Encodings
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import okio.source
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.cache.annotation.Cacheable
import org.springframework.stereotype.Service
import space.davids_digital.sweetie.integration.openai.dto.ChatCompletion
import space.davids_digital.sweetie.integration.openai.dto.ChatCompletionRequest
import space.davids_digital.sweetie.integration.openai.dto.ChatMessage
import space.davids_digital.sweetie.integration.openai.dto.ErrorResponse
import space.davids_digital.sweetie.integration.openai.dto.Tool

@Service
class OpenAiService(
    @Qualifier("openaiSecretKey")
    private val openaiSecretKey: String,
    private val httpClient: HttpClient
) {
    companion object {
        private val log = LoggerFactory.getLogger(OpenAiService::class.java)
    }

    private val client: OpenAI = OpenAI(token = openaiSecretKey, logging = LoggingConfig(logLevel = LogLevel.None))
    private val registry = Encodings.newDefaultEncodingRegistry()

    @Cacheable("OpenAiService.getAvailableGptOnlyModels")
    suspend fun getAvailableGptOnlyModels(): List<String> {
        log.info("Getting available GPT models")
        return client.models().map { it.id.id }.filter { it.startsWith("gpt") || it.startsWith("ft:gpt") }
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
        temperature: Double,
        topP: Double,
        frequencyPenalty: Double,
        presencePenalty: Double,
        modalities: List<String>,
        audioVoice: String,
    ): ChatMessage {
        val request = ChatCompletionRequest(
            model = model,
            messages = messages,
            tools = tools.ifEmpty { null },
            temperature = temperature,
            maxTokens = maxTokens,
            topP = topP,
            modalities = modalities,
            frequencyPenalty = frequencyPenalty,
            presencePenalty = presencePenalty,
            audio = ChatCompletionRequest.Audio(
                voice = audioVoice,
                format = "mp3"
            )
        )
        val response = httpClient.post("https://api.openai.com/v1/chat/completions") {
            headers.append(HttpHeaders.Authorization, "Bearer $openaiSecretKey")
            contentType(io.ktor.http.ContentType.Application.Json)
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

    suspend fun image(prompt: String, size: String): String {
        if (size !in listOf("1024x1024", "1792x1024", "1024x1792")) {
            throw IllegalArgumentException("Size must be one of 1024x1024, 1792x1024, 1024x1792, but was $size")
        }
        return client.imageURL(ImageCreation(
            prompt = prompt,
            model = ModelId("dall-e-3"),
            size = ImageSize(size)
        )).first().url
    }

    suspend fun transcription(audio: ByteArray): String {
        return client.transcription(TranscriptionRequest(
            model = ModelId("whisper-1"),
            audio = FileSource("audio.mp3", audio.inputStream().source())
        )).text
    }
}
