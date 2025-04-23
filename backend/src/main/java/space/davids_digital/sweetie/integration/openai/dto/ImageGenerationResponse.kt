package space.davids_digital.sweetie.integration.openai.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ImageGenerationResponse(
    @SerialName("created")                  val created: Int,
    @SerialName("data")                     val data: List<Data> = emptyList(),
) {
    @Serializable
    data class Data(
        @SerialName("b64_json")
        val base64Json: String,
    )
}