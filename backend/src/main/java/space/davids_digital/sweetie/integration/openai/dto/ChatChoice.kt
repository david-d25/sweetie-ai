package space.davids_digital.sweetie.integration.openai.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ChatChoice(
    @SerialName("index")    val index: Int,
    @SerialName("message")  val message: ChatMessage,
)
