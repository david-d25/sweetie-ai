package space.davids_digital.sweetie.integration.openai.dto

import kotlinx.serialization.DeserializationStrategy
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonContentPolymorphicSerializer
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive

@Serializable
data class ChatMessage (
    @SerialName("role")
    var role: ChatRole,

    @SerialName("content")
    var content: Content? = null,

    @SerialName("tool_calls")
    val toolCalls: List<ToolCall>? = null,

    @SerialName("tool_call_id")
    val toolCallId: String? = null,

    @SerialName("audio")
    val audio: Audio? = null,
) {
    companion object {
        fun system(content: String? = null): ChatMessage {
            return ChatMessage(
                role = ChatRole.System,
                content = content?.let { TextContent(it) }
            )
        }

        fun user(content: String): ChatMessage {
            return ChatMessage(
                role = ChatRole.User,
                content = TextContent(content),
            )
        }

        fun user(content: List<ContentPart>): ChatMessage {
            return ChatMessage(
                role = ChatRole.User,
                content = ListContent(content)
            )
        }

        fun assistant(
            content: String? = null,
            toolCalls: List<ToolCall>? = null
        ): ChatMessage {
            return ChatMessage(
                role = ChatRole.Assistant,
                content = content?.let { TextContent(it) },
                toolCalls = toolCalls,
            )
        }

        fun tool(content: String? = null, toolCallId: String): ChatMessage {
            return ChatMessage(
                role = ChatRole.Tool,
                content = content?.let { TextContent(it) },
                toolCallId = toolCallId,
            )
        }
    }
}

@Serializable(with = ContentSerializer::class)
interface Content

@JvmInline
@Serializable
value class TextContent(val content: String): Content

@JvmInline
@Serializable
value class ListContent(val content: List<ContentPart>): Content

@Serializable
sealed interface ContentPart

@Serializable
@SerialName("text")
data class TextPart(@SerialName("text") val text: String): ContentPart

@Serializable
@SerialName("image_url")
data class ImagePart(@SerialName("image_url") val imageUrl: ImageURL): ContentPart {
    constructor(url: String, detail: String? = null): this(ImageURL(url = url, detail = detail))

    @Serializable
    data class ImageURL(
        @SerialName("url") val url: String,
        @SerialName("detail") val detail: String? = null,
    )
}

@Serializable
@SerialName("input_audio")
data class InputAudioPart(@SerialName("input_audio") val inputAudio: InputAudio): ContentPart {
    @Serializable
    data class InputAudio(
        @SerialName("data") val data: String,
        @SerialName("format") val format: String,
    )
}

@Serializable
sealed interface ToolCall {
    @Serializable
    @SerialName("function")
    data class Function(
        @SerialName("id") val id: String,
        @SerialName("function") val function: FunctionCall,
    ): ToolCall
}

@Serializable
data class FunctionCall(
    @SerialName("name") val nameOrNull: String? = null,
    @SerialName("arguments") val argumentsOrNull: String? = null,
) {
    val name: String get() = requireNotNull(nameOrNull)
    val arguments: String get() = requireNotNull(argumentsOrNull)
}

@Serializable
data class Audio(
    @SerialName("id")           val id: String,
    @SerialName("data")         val dataBase64: String,
    @SerialName("transcript")   val transcript: String,
)

class ContentSerializer: JsonContentPolymorphicSerializer<Content>(Content::class) {
    override fun selectDeserializer(element: JsonElement): DeserializationStrategy<Content> {
        return when (element) {
            is JsonPrimitive -> TextContent.serializer()
            is JsonArray -> ListContent.serializer()
            else -> throw SerializationException("Unsupported JSON element: $element")
        }
    }
}
