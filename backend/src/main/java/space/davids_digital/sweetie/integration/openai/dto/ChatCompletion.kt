package space.davids_digital.sweetie.integration.openai.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ChatCompletion(
    @SerialName("id")                   val id: String,
    @SerialName("created")              val created: Long,
    @SerialName("model")                val model: String,
    @SerialName("choices")              val choices: List<ChatChoice>,
    @SerialName("system_fingerprint")   val systemFingerprint: String? = null,
)
