package space.davids_digital.sweetie.integration.openai

import com.aallam.openai.client.OpenAI
import com.knuddels.jtokkit.Encodings
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

    private val client: OpenAI = OpenAI(openaiSecretKey)
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
}
