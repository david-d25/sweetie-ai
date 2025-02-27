package space.davids_digital.sweetie.integration.openai.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Tool(
    @SerialName("type")
    val type: String = "function",

    @SerialName("function")
    val function: FunctionTool,
) {
    companion object {
        fun function(name: String, description: String? = null, parameters: Parameters) =
            Tool(function = FunctionTool(name = name, description = description, parameters = parameters))
    }
}

@Serializable
data class FunctionTool(
    @SerialName("name")
    val name: String,

    @SerialName("parameters")
    val parameters: Parameters? = null,

    @SerialName("description")
    val description: String? = null
)
