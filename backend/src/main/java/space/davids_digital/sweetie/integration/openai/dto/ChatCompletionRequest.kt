package space.davids_digital.sweetie.integration.openai.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ChatCompletionRequest(
    @SerialName("model")                val model: String,
    @SerialName("messages")             val messages: List<ChatMessage>,
    @SerialName("temperature")          val temperature: Double? = null,
    @SerialName("top_p")                val topP: Double? = null,
    @SerialName("n")                    val n: Int? = null,
    @SerialName("max_tokens")           val maxTokens: Int? = null,
    @SerialName("presence_penalty")     val presencePenalty: Double? = null,
    @SerialName("frequency_penalty")    val frequencyPenalty: Double? = null,
    @SerialName("tools")                val tools: List<Tool>? = null,
    @SerialName("modalities")           val modalities: List<String>? = null,
    @SerialName("audio")                val audio: Audio? = null,
) {
    @Serializable
    data class Audio(
        @SerialName("voice")            val voice: String,
        @SerialName("format")           val format: String
    )
}