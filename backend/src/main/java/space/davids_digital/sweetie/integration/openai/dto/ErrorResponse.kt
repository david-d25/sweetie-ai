package space.davids_digital.sweetie.integration.openai.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ErrorResponse (
    @SerialName("error")

    val error: Error
) {
    @Serializable
    data class Error (
        @SerialName("message")
        val message: String,
    )
}