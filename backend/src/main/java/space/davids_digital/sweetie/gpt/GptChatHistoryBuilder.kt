package space.davids_digital.sweetie.gpt

import com.aallam.openai.api.chat.*
import com.google.gson.Gson
import space.davids_digital.sweetie.integration.openai.OpenAiService

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

    fun build(): List<ChatMessage> {
        val resultWrapped = mutableListOf<WrappedMessage>()

        if (systemMessage != null) {
            val systemChatMessage = ChatMessage(
                role = ChatRole.System,
                content = systemMessage
            )
            resultWrapped.add(WrappedMessage(systemChatMessage, true))
        }

        resultWrapped.addAll(wrappedMessages)

        val toolsJsonString = gson.toJson(tools)
        val toolsTokenCount = openAiService.estimateTokenCount(toolsJsonString, model)

        fun countTokens(): Int {
            val resultWrappedNoImages = mutableListOf<WrappedMessage>()
            for (wrapped in resultWrapped) {
                if (wrapped.message.role == ChatRole.User) {
                    val userMessageContent = wrapped.message.messageContent
                    if (userMessageContent is ListContent) {
                        val userMessageNoImages = userMessageContent.content.filter { it !is ImagePart }
                        resultWrappedNoImages.add(
                            WrappedMessage(
                            ChatMessage(
                                role = ChatRole.User,
                                messageContent = ListContent(userMessageNoImages)
                            ),
                            wrapped.hard
                        )
                        )
                    } else {
                        resultWrappedNoImages.add(wrapped)
                    }
                } else {
                    resultWrappedNoImages.add(wrapped)
                }
            }
            var result = openAiService.estimateTokenCount(gson.toJson(resultWrappedNoImages), model) + toolsTokenCount
            for (wrapped in resultWrapped) {
                // Count images
                if (wrapped.message.role == ChatRole.User) {
                    val userMessageContent = wrapped.message.messageContent
                    if (userMessageContent is ListContent) {
                        for (part in userMessageContent.content) {
                            if (part is ImagePart) {
                                result += 765 // assuming 765 tokens per image
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