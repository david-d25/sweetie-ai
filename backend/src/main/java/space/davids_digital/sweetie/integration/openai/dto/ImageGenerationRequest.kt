package space.davids_digital.sweetie.integration.openai.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ImageGenerationRequest(
    @SerialName("prompt")                   val prompt: String,
    @SerialName("background")               val background: String? = null,
    @SerialName("model")                    val model: String,
    @SerialName("moderation")               val moderation: String? = null,
    @SerialName("n")                        val n: Int? = null,
    @SerialName("output_compression")       val outputCompression: Int? = null,
    @SerialName("output_format")            val outputFormat: String? = null,
    @SerialName("quality")                  val quality: String? = null,
    @SerialName("size")                     val size: String? = null,
)