package space.davids_digital.sweetie.gpt

import com.google.gson.Gson
import space.davids_digital.sweetie.integration.openai.OpenAiService
import space.davids_digital.sweetie.integration.openai.dto.ChatMessage
import space.davids_digital.sweetie.integration.openai.dto.ChatRole
import space.davids_digital.sweetie.integration.openai.dto.ImagePart
import space.davids_digital.sweetie.integration.openai.dto.InputAudioPart
import space.davids_digital.sweetie.integration.openai.dto.ListContent
import space.davids_digital.sweetie.integration.openai.dto.TextContent
import space.davids_digital.sweetie.integration.openai.dto.TextPart
import space.davids_digital.sweetie.integration.openai.dto.Tool

class GptChatHistoryBuilder(private val model: String, private val openAiService: OpenAiService) {
    private data class WrappedMessage(
        val message: ChatMessage,
        val hard: Boolean
    )

    private var tokenLimit = 0
    private var systemMessage: String? = null
    private val wrappedMessages: MutableList<WrappedMessage> = mutableListOf()
    private val tools: MutableList<Tool> = mutableListOf()
    private val gson = Gson()

    fun getTokenLimit(): Int {
        return tokenLimit
    }

    fun setTokenLimit(tokenLimit: Int): GptChatHistoryBuilder {
        this.tokenLimit = tokenLimit
        return this
    }

    fun setSystemMessage(systemMessage: String?): GptChatHistoryBuilder {
        this.systemMessage = systemMessage
        return this
    }

    fun getTools(): List<Tool> {
        return tools
    }

    fun setTools(tools: List<Tool>): GptChatHistoryBuilder {
        this.tools.clear()
        this.tools.addAll(tools)
        return this
    }

    fun addSoftMessage(message: ChatMessage): GptChatHistoryBuilder {
        wrappedMessages.add(WrappedMessage(message, false))
        return this
    }

    fun addHardMessage(message: ChatMessage): GptChatHistoryBuilder {
        wrappedMessages.add(WrappedMessage(message, true))
        return this
    }

    fun removeLastMessage() {
        wrappedMessages.removeLastOrNull()
    }

    fun build(visionSupported: Boolean, audioSupported: Boolean): List<ChatMessage> {
        val resultWrapped = mutableListOf<WrappedMessage>()

        if (systemMessage != null) {
            val systemChatMessage = ChatMessage(
                role = ChatRole.System,
                content = TextContent(systemMessage!!)
            )
            resultWrapped.add(WrappedMessage(systemChatMessage, true))
        }

        wrappedMessages.forEach {
            if (!visionSupported && it.message.content is ListContent) {
                val userMessageContent = it.message.content as ListContent
                val filteredContent = userMessageContent.content.filter { it !is ImagePart }
                resultWrapped.add(WrappedMessage(ChatMessage.user(filteredContent), it.hard))
            } else if (!audioSupported && it.message.content is ListContent) {
                val userMessageContent = it.message.content as ListContent
                val filteredContent = userMessageContent.content.filter { it !is InputAudioPart }
                resultWrapped.add(WrappedMessage(ChatMessage.user(filteredContent), it.hard))
            } else {
                resultWrapped.add(it)
            }
        }

        val toolsJsonString = gson.toJson(tools)
        val toolsTokenCount = openAiService.estimateTokenCount(toolsJsonString, model)

        fun countTokens(): Int {
            val resultWrappedTextOnly = mutableListOf<WrappedMessage>()
            for (wrapped in resultWrapped) {
                if (wrapped.message.role == ChatRole.User) {
                    val userMessageContent = wrapped.message.content
                    if (userMessageContent is ListContent) {
                        val userMessageTextOnly = userMessageContent.content.filterIsInstance<TextPart>()
                        resultWrappedTextOnly.add(
                            WrappedMessage(
                                ChatMessage(
                                    role = ChatRole.User,
                                    content = ListContent(userMessageTextOnly)
                                ),
                                wrapped.hard
                            )
                        )
                    } else {
                        resultWrappedTextOnly.add(wrapped)
                    }
                } else {
                    resultWrappedTextOnly.add(wrapped)
                }
            }
            var result = openAiService.estimateTokenCount(gson.toJson(resultWrappedTextOnly), model) + toolsTokenCount
            for (wrapped in resultWrapped) {
                // Count images
                if (wrapped.message.role == ChatRole.User) {
                    val userMessageContent = wrapped.message.content
                    if (userMessageContent is ListContent) {
                        for (part in userMessageContent.content) {
                            if (part is ImagePart) {
                                result += 765 // assuming 765 tokens per image
                            }
                            if (part is InputAudioPart) {
                                result += 1000 // assuming 1000 tokens per audio
                            }
                        }
                    }
                }
            }
            return result
        }

        while (countTokens() > tokenLimit) {
            val firstSoftMessageIndex = resultWrapped.indexOfFirst { !it.hard }
            if (firstSoftMessageIndex == -1) {
                break
            }
            resultWrapped.removeAt(firstSoftMessageIndex)
        }

        return resultWrapped.map { it.message }
    }
}