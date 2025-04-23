package space.davids_digital.sweetie.integration.openai.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ImageEditRequest(
    @SerialName("image")                    val images: List<String>,
    @SerialName("prompt")                   val prompt: String,
    @SerialName("model")                    val model: String,
    @SerialName("n")                        val n: Int? = null,
    @SerialName("output_format")            val outputFormat: String? = null,
    @SerialName("quality")                  val quality: String? = null,
    @SerialName("size")                     val size: String? = null,
)