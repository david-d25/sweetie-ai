package space.davids_digital.sweetie.integration.openai

import com.aallam.openai.api.audio.SpeechRequest
import com.aallam.openai.api.audio.SpeechResponseFormat
import com.aallam.openai.api.audio.TranscriptionRequest
import com.aallam.openai.api.audio.Voice
import com.aallam.openai.api.chat.ChatCompletionRequest
import com.aallam.openai.api.chat.ChatMessage
import com.aallam.openai.api.chat.Tool
import com.aallam.openai.api.file.FileSource
import com.aallam.openai.api.image.ImageCreation
import com.aallam.openai.api.image.ImageSize
import com.aallam.openai.api.logging.LogLevel
import com.aallam.openai.api.model.ModelId
import com.aallam.openai.client.LoggingConfig
import com.aallam.openai.client.OpenAI
import com.knuddels.jtokkit.Encodings
import okio.Buffer
import okio.ByteString
import okio.source
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.cache.annotation.Cacheable
import org.springframework.stereotype.Service

@Service
class OpenAiService(
    @Qualifier("openaiSecretKey")
    private val openaiSecretKey: String
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
        presencePenalty: Double
    ): ChatMessage {
        val response = client.chatCompletion(ChatCompletionRequest(
            model = ModelId(model),
            messages = messages,
            tools = tools.ifEmpty { null },
            temperature = temperature,
            maxTokens = maxTokens,
            topP = topP,
            frequencyPenalty = frequencyPenalty,
            presencePenalty = presencePenalty,
        ))
        return response.choices.first().message
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
