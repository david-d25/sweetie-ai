package space.davids_digital.sweetie.service

import com.vk.api.sdk.objects.messages.MessageAttachment
import com.vk.api.sdk.objects.messages.MessageAttachmentType
import com.vk.api.sdk.objects.messages.SetActivityType
import jakarta.annotation.PostConstruct
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import space.davids_digital.sweetie.gpt.GptChatHistoryBuilder
import space.davids_digital.sweetie.gpt.InvocationContext
import space.davids_digital.sweetie.gpt.tool.function.AssistantFunction
import space.davids_digital.sweetie.gpt.tool.function.parameter.ParameterSchemaGenerator
import space.davids_digital.sweetie.integration.openai.OpenAiService
import space.davids_digital.sweetie.integration.openai.dto.ChatMessage
import space.davids_digital.sweetie.integration.openai.dto.ChatRole
import space.davids_digital.sweetie.integration.openai.dto.Content
import space.davids_digital.sweetie.integration.openai.dto.ContentPart
import space.davids_digital.sweetie.integration.openai.dto.FunctionTool
import space.davids_digital.sweetie.integration.openai.dto.ImagePart
import space.davids_digital.sweetie.integration.openai.dto.InputAudioPart
import space.davids_digital.sweetie.integration.openai.dto.InputAudioPart.InputAudio
import space.davids_digital.sweetie.integration.openai.dto.ListContent
import space.davids_digital.sweetie.integration.openai.dto.Parameters
import space.davids_digital.sweetie.integration.openai.dto.TextContent
import space.davids_digital.sweetie.integration.openai.dto.TextPart
import space.davids_digital.sweetie.integration.openai.dto.Tool
import space.davids_digital.sweetie.integration.openai.dto.ToolCall
import space.davids_digital.sweetie.integration.vk.VkMessageService
import space.davids_digital.sweetie.integration.vk.VkUserService
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.orm.service.VkAudioTranscriptOrmService
import space.davids_digital.sweetie.orm.service.VkMessageOrmService
import space.davids_digital.sweetie.orm.service.VkUserOrmService
import space.davids_digital.sweetie.util.DownloadUtils.download
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Base64
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.reflect.KClass
import kotlin.reflect.KParameter
import kotlin.reflect.full.primaryConstructor

@Service
class SweetieService(
    private val vkUserService: VkUserService,
    private val vkUserOrmService: VkUserOrmService,
    private val vkMessageService: VkMessageService,
    private val vkMessagesOrmService: VkMessageOrmService,
    private val vkAudioTranscriptService: VkAudioTranscriptService,
    private val vkAudioTranscriptOrmService: VkAudioTranscriptOrmService,
    private val chatSettingsService: ChatSettingsService,
    private val usagePlanService: UsagePlanService,
    private val openAiService: OpenAiService,
    assistantFunctionsGeneric: List<AssistantFunction<*>>,
    @Qualifier("vkGroupId")
    private val vkGroupId: Long
) {
    companion object {
        private val log = LoggerFactory.getLogger(SweetieService::class.java)
    }

    @Suppress("unchecked_cast")
    private val assistantFunctions = assistantFunctionsGeneric as List<AssistantFunction<Any>>

    @PostConstruct
    fun init() {
        log.info("Detected assistant functions: " + assistantFunctions.joinToString(", ") { it.getName() })
    }

    suspend fun onMessage(vkMessage: VkMessageModel) {
        log.info("Received message")
        if (
            vkMessage.text.isNullOrBlank()
            && vkMessage.attachmentDtos.none {
                it.type in listOf(
                    MessageAttachmentType.AUDIO_MESSAGE,
                    MessageAttachmentType.PHOTO,
                    MessageAttachmentType.STICKER
                )
            }
        ) {
            log.info("Message is not interesting, ignoring")
            return
        }

        val user = vkUserOrmService.getOrCreateDefault(vkMessage.fromId)
        if (user.credits <= 0) {
            handleNotEnoughCredits(vkMessage)
            return
        }

        val chatSettings = withContext(Dispatchers.IO) {
            chatSettingsService.getOrCreateDefault(vkMessage.peerId)
        }
        val modelName = chatSettings.gptModel
        val visionSupported = modelName.contains("vision")
                || modelName.startsWith("gpt-4-turbo")
                || modelName.startsWith("gpt-4o")
                || modelName.startsWith("gpt-4.5")
                || modelName.startsWith("chatgpt-4o")
        val systemMessage = createSystemMessage(ZonedDateTime.now(), chatSettings.context)

        val builder = GptChatHistoryBuilder(chatSettings.gptModel, openAiService)
        builder.setTokenLimit(chatSettings.gptMaxInputTokens)
        builder.setSystemMessage(systemMessage)

        val latestVkMessages = vkMessagesOrmService.getMessagesByPeerIdOrderByTimestampDesc(
            vkMessage.peerId,
            PageRequest.of(0, 128)
        )

        for ((index, historyItem) in latestVkMessages.withIndex()) {
            if (historyItem.fromId == -vkGroupId) {
                builder.addSoftMessage(ChatMessage.assistant(
                    vkMessageToString(historyItem, chatSettings.processAudioMessages)
                ))
                // Adding images and sticker as user so assistant can see them
                val imageAttachments = historyItem.attachmentDtos.filter { it.type == MessageAttachmentType.PHOTO }
                val stickerAttachments = historyItem.attachmentDtos.filter { it.type == MessageAttachmentType.STICKER }
                if (imageAttachments.isEmpty() && stickerAttachments.isEmpty()) {
                    continue
                }
                val imageContentList: MutableList<ContentPart> = mutableListOf()
                imageContentList.add(TextPart("[INTERNAL] This is the image(s) you sent in the previous message:"))
                imageAttachments.forEach { attachment ->
                    imageContentList.add(ImagePart(attachment.photo.sizes.maxBy { it.width }.url.toString()))
                }
                builder.addSoftMessage(ChatMessage.user(imageContentList))
                val stickerContentList: MutableList<ContentPart> = mutableListOf()
                stickerContentList.add(TextPart("[INTERNAL] This is the sticker you sent in the previous message:"))
                stickerAttachments.forEach { attachment ->
                    stickerContentList.add(ImagePart(attachment.sticker.images.maxBy { it.width }.url.toString()))
                }
                builder.addSoftMessage(ChatMessage(role = ChatRole.User, content = ListContent(stickerContentList)))
            } else {
                val chatMessage = ChatMessage(
                    role = ChatRole.User,
                    content = createUserContent(historyItem, chatSettings.processAudioMessages)
                )
                if (index != latestVkMessages.size - 1) {
                    builder.addSoftMessage(chatMessage)
                } else {
                    builder.addHardMessage(chatMessage)
                }
            }
        }

        val maxRuns = 8
        var currentRun = 0
        var creditsCost = 1L
        var continuationMode: String
        var voiceModeRequested = false
        var lastResponse: ChatMessage? = null
        val attachments = mutableListOf<MessageAttachment>()
        do {
            val history = builder.build(visionSupported && !voiceModeRequested, voiceModeRequested)
            try {
                if (voiceModeRequested) {
                    vkMessageService.indicateActivity(vkMessage.peerId, SetActivityType.AUDIOMESSAGE)
                } else {
                    vkMessageService.indicateActivity(vkMessage.peerId, SetActivityType.TYPING)
                }
                val messagesToAppend = mutableListOf<ChatMessage>()
                val invocationContext = object : InvocationContext {
                    override fun addAttachment(attachment: MessageAttachment) {
                        attachments.add(attachment)
                    }
                    override fun requestStop() {
                        continuationMode = "stop"
                    }
                    override fun requestVoiceMode() {
                        voiceModeRequested = true
                    }
                    override fun voiceModeRequested(): Boolean {
                        return voiceModeRequested
                    }
                    override fun appendMessage(message: ChatMessage) {
                        messagesToAppend.add(message)
                    }
                    override fun chargeCredits(credits: Long) {
                        creditsCost += credits
                    }
                    override fun lookupAttachment(attachmentId: Int): MessageAttachment? {
                        for (searchItem in latestVkMessages) {
                            for (attachment in searchItem.attachmentDtos) {
                                if (attachment.getId() == attachmentId) {
                                    return attachment
                                }
                            }
                        }
                        return null
                    }
                }
                builder.setTools(assistantFunctions.filter { it.isVisible(vkMessage, invocationContext) }.map {
                    val parameters = it.getParametersClass().let { c ->
                        if (c != Unit::class) {
                            Parameters.fromJsonString(ParameterSchemaGenerator().generateString(c))
                        } else {
                            null
                        }
                    }
                    Tool(function = FunctionTool(it.getName(), parameters, it.getDescription()))
                })
                log.info("Requesting GPT in ${if (voiceModeRequested) "voice mode" else "normal mode"}" +
                        ", run ${currentRun+1}" +
                        ", passing ${history.size} messages and ${builder.getTools().size} tools")
                val modelOverride = if (voiceModeRequested) "gpt-4o-audio-preview" else chatSettings.gptModel
                val isReasoningModel = modelName.startsWith("o")
                val modalities = if (isReasoningModel) {
                    null
                } else {
                    listOf("text") + if (voiceModeRequested) listOf("audio") else emptyList()
                }
                val temperature = if (isReasoningModel) null else chatSettings.gptTemperature
                lastResponse = openAiService.completion(
                    messages = history,
                    tools = builder.getTools(),
                    model = modelOverride,
                    maxTokens = chatSettings.gptMaxOutputTokens,
                    temperature = temperature,
                    topP = chatSettings.gptTopP,
                    frequencyPenalty = chatSettings.gptFrequencyPenalty,
                    presencePenalty = chatSettings.gptPresencePenalty,
                    modalities = modalities,
                    audioVoice = chatSettings.ttsVoice,
                )
                builder.addHardMessage(lastResponse)
                val textLength = if (lastResponse.content is TextContent) {
                    (lastResponse.content as TextContent).content.length
                } else {
                    0
                }
                val toolCallsLength = lastResponse.toolCalls?.size ?: 0
                log.info("GPT response has length $textLength and $toolCallsLength tool calls")

                continuationMode = "auto"

                if (lastResponse.toolCalls?.isNotEmpty() == true) {
                    val toolCallsString = lastResponse.toolCalls.joinToString(", ") {
                        if (it is ToolCall.Function)
                            it.function.nameOrNull ?: "(null)"
                        else
                            "(unknown)"
                    }
                    log.info("Handling tool calls: $toolCallsString")
                    handleToolCalls(builder, lastResponse.toolCalls, invocationContext, vkMessage)
                }
                messagesToAppend.forEach(builder::addHardMessage)
                if (lastResponse.content != null
                    && lastResponse.content is TextContent
                    && (lastResponse.content as TextContent).content.contains(Regex("<\\|.*?\\|>"))) {
                    log.warn("Assistant response contains <| or |> tags, re-asking GPT")
                    builder.addHardMessage(
                        ChatMessage.user("""
                                [INTERNAL] Your response contains `<|` and `|>` symbols, which is illegal. 
                                Repeat without these symbols. 
                        """.trimIndent())
                    )
                    continuationMode = "continue"
                } else if (lastResponse.content != null
                    && lastResponse.content is TextContent
                    && (lastResponse.content as TextContent).content.isBlank()) {
                    log.warn("Assistant response is empty, re-asking GPT")
                    builder.addHardMessage(
                        ChatMessage.user("[INTERNAL] Your response is empty. Try again.")
                    )
                } else if (voiceModeRequested && lastResponse.audio == null && lastResponse.toolCalls == null) {
                    log.warn("Voice mode requested, but no audio response received, re-asking GPT")
                    builder.removeLastMessage()
                    builder.setTokenLimit(builder.getTokenLimit()/2) // Workaround for GPT-4o bug
                    continuationMode = "continue"
                }
            } catch (e: Exception) {
                log.error("Error while calling GPT", e)
                continuationMode = "stop"
                creditsCost = 1
                vkMessageService.send(vkMessage.peerId, "Сладенький не может ответить (${e.message})")
            }

            currentRun++
        } while (
            currentRun < maxRuns && (
                continuationMode == "auto" && (lastResponse?.content == null && lastResponse?.audio == null)
                        || continuationMode == "continue"
            )
        )

        var audioMessageTranscript: String? = null
        var audioMessageAttachmentId: Int? = null
        if (lastResponse?.audio != null) {
            val data = Base64.getDecoder().decode(lastResponse.audio.dataBase64)
            audioMessageTranscript = lastResponse.audio.transcript
            val attachment = vkMessageService.uploadVoiceMessageAttachment(vkMessage.peerId, data)
            audioMessageAttachmentId = attachment.audioMessage.id
            attachments.add(attachment)
        }

        if (lastResponse?.content is TextContent
            && (lastResponse.content as TextContent).content.isNotBlank() || attachments.isNotEmpty()) {

            val text = if (lastResponse?.content is TextContent) {
                (lastResponse.content as TextContent).content
            } else {
                ""
            }
            val newMessageConvId = vkMessageService.send(
                vkMessage.peerId,
                sanitizeAssistantResponse(text),
                attachments
            )
            log.info("Message sent to peerId = ${vkMessage.peerId}")
            if (audioMessageTranscript != null && audioMessageAttachmentId != null) {
                vkAudioTranscriptOrmService.saveTranscriptForAudioMessage(
                    audioMessageAttachmentId,
                    audioMessageTranscript,
                    newMessageConvId,
                    vkMessage.peerId,
                    0
                )
            }
        }
        withContext(Dispatchers.IO) {
            vkUserOrmService.addCredits(vkMessage.fromId, -creditsCost)
        }
        log.info("Answering finished, $creditsCost credits deducted")
    }

    private fun sanitizeAssistantResponse(text: String): String {
        return text
            .replace(Regex("([*_]{1,3})(\\S.*?\\S?)\\1"), "$2") // Styles
            .replace(Regex("!\\[(.*?)][\\[(].*?[])]"), "") // Images
            .replace(Regex("\\[(.*?)]\\([^\\s)]+\\s*(?:\".*?\")?\\)"), "$1") // URLs
            .replace(Regex("\\[(.*?)]\\[[^]]+]"), "$1") // URLs
            .replace(Regex("\n====+\n"), "\n")
            .replace(Regex("\n----+\n"), "\n")
            .replace(Regex("(#+\\s*)(.*?)(\n|$)"), "$2\n")
            .replace(Regex("^\\s*>+\\s?"), "") // Quotes
            .replace("@all", "@???")
            .replace("@online", "@??????")
            .replace(Regex("<\\|.*?\\|>"), "")
    }

    private fun handleNotEnoughCredits(message: VkMessageModel) {
        val secondsRequired = usagePlanService.getTimeInSecondsRequiredToHaveEnoughCredits(message.fromId, 1)
        if (secondsRequired == Long.MAX_VALUE) {
            vkMessageService.send(message.peerId, "У тебя достигнут лимит сообщений, я не могу ответить")
            return
        }
        val timeMessage = when {
            secondsRequired <= 0 -> "15 секунд"
            secondsRequired < 60 -> "$secondsRequired секунд"
            secondsRequired < 3600 -> "${ceil(secondsRequired / 60.0).toInt()} минут"
            secondsRequired < 86400 -> {
                val hours = floor(secondsRequired / 3600.0).toInt()
                val minutes = ceil((secondsRequired % 3600) / 60.0).toInt()
                "$hours ч. $minutes мин."
            }
            else -> {
                val days = floor(secondsRequired / 86400.0).toInt()
                val hours = floor((secondsRequired % 86400) / 3600.0).toInt()
                val minutes = ceil((secondsRequired % 3600) / 60.0).toInt()
                "$days дн. $hours ч. $minutes мин."
            }
        }
        vkMessageService.send(message.peerId, "Слишком много сообщений, пожалуйста напиши мне через $timeMessage")
    }

    private suspend fun vkMessageToString(message: VkMessageModel, transcriptionEnabled: Boolean): String {
        val user = vkUserService.getUser(message.fromId)
        val displayName = if (user == null) "(unknown)" else user.firstNameCached + " " + user.lastNameCached
        val timeString = LocalDateTime.ofInstant(message.timestamp, ZoneId.systemDefault())
            .format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"))
        val builder = StringBuilder()

        if (message.forwardedMessages.isNotEmpty()) {
            builder.append("<|FORWARDED_MESSAGES|>\n")
            for (forwardedMessage in message.forwardedMessages) {
                builder.append(vkMessageToString(forwardedMessage, transcriptionEnabled)).append("\n")
            }
            builder.append("<|FORWARDED_MESSAGES_END|>\n")
        }

        if (message.fromId != -vkGroupId) {
            builder.append("<|MESSAGE_METADATA " +
                    "user_id=\"${message.fromId}\" " +
                    "user_name=\"${displayName}\" " +
                    "time=\"${timeString}\"|>\n")
        }

        if (message.text?.isNotBlank() == true) {
            builder.append(message.text).append("\n")
        }

        message.attachmentDtos.forEach { attachment ->
            when (attachment.type) {
                MessageAttachmentType.AUDIO_MESSAGE -> {
                    val audioMessage = attachment.audioMessage
                    val transcript = vkAudioTranscriptService.getTranscriptIfCached(audioMessage.id)
                        ?: if (transcriptionEnabled) {
                            vkAudioTranscriptService.getTranscriptForAudioMessage(message)
                        } else {
                            "(transcription disabled)"
                        }
                    builder.append("<|AUDIO_MESSAGE transcript=\"${escapeXml(transcript)}\"|>\n")
                }
                MessageAttachmentType.PHOTO -> {
                    val photo = attachment.photo
                    builder.append("<|PHOTO id=\"${photo.id}\"")
                    if (photo.text.isNotBlank()) {
                        builder.append(" text=\"${escapeXml(photo.text)}\"")
                    }
                    if (photo.likes != null) {
                        builder.append(" likes=\"${photo.likes.count}\"")
                    }
                    builder.append("|>\n")
                }
                MessageAttachmentType.STICKER -> {
                    val sticker = attachment.sticker
                    builder.append("<|STICKER id=\"${sticker.stickerId}\" pack-id=\"${sticker.productId}\"|>\n")
                }
                else -> {
                    builder.append("<|ATTACHMENT type=\"${attachment.type}\"|>\n")
                }
            }
        }

        return builder.toString()
    }

    private suspend fun createUserContent(message: VkMessageModel, transcriptionEnabled: Boolean): Content {
        val text = vkMessageToString(message, transcriptionEnabled)
        val imageAttachments = message.attachmentDtos.filter { it.type == MessageAttachmentType.PHOTO }
        val stickerAttachments = message.attachmentDtos.filter { it.type == MessageAttachmentType.STICKER }
        val audioMessageAttachments = message.attachmentDtos.filter { it.type == MessageAttachmentType.AUDIO_MESSAGE }
        val content = mutableListOf<ContentPart>()
        content.add(TextPart(text))
        imageAttachments.forEach { attachment ->
            content.add(ImagePart(attachment.photo.sizes.maxBy { it.width }.url.toString()))
        }
        stickerAttachments.forEach { attachment ->
            content.add(ImagePart(attachment.sticker.images.maxBy { it.width }.url.toString()))
        }
        audioMessageAttachments.forEach { attachment ->
            val data = download(attachment.audioMessage.linkMp3)
            val base64 = Base64.getEncoder().encodeToString(data)
            content.add(InputAudioPart(InputAudio(base64, "mp3")))
        }
        return ListContent(content)
    }

    private suspend fun handleToolCalls(
        builder: GptChatHistoryBuilder,
        toolCalls: List<ToolCall>,
        invocationContext: InvocationContext,
        message: VkMessageModel
    ) {
        for (toolCall in toolCalls) {
            try {
                if (toolCall is ToolCall.Function) {
                    handleFunctionCall(builder, toolCall, invocationContext, message)
                } else {
                    log.error("Unknown tool call type, toolCall = $toolCall")
                }
            } catch (e: Exception) {
                builder.addHardMessage(
                    ChatMessage.tool(
                        content = "Tool call failed: ${e.message}",
                        toolCallId = (toolCall as? ToolCall.Function)?.id!!
                    )
                )
                log.error("Tool call failed", e)
            }
        }
    }

    private suspend fun handleFunctionCall(
        builder: GptChatHistoryBuilder,
        toolCall: ToolCall.Function,
        invocationContext: InvocationContext,
        message: VkMessageModel
    ) {
        val function = assistantFunctions.find { it.getName() == toolCall.function.nameOrNull }
        if (function == null) {
            builder.addHardMessage(
                ChatMessage.tool(
                    content = "Function not found: ${toolCall.function.nameOrNull}",
                    toolCallId = toolCall.id
                )
            )
            return
        }
        val argumentsJson = toolCall.function.arguments
        val parametersClass = function.getParametersClass()
        val parameters = createParametersObject(parametersClass, argumentsJson)
        val response = function.call(parameters, message, invocationContext)
        builder.addHardMessage(ChatMessage.tool(content = response, toolCallId = toolCall.id))
    }

    private fun createParametersObject(parametersClass: KClass<*>, jsonString: String): Any {
        if (parametersClass == Unit::class) {
            return Unit
        }
        val jsonElement = Json.parseToJsonElement(jsonString)
        if (jsonElement !is JsonObject) {
            throw IllegalArgumentException("Expected JSON object, but was ${jsonElement::class.simpleName}")
        }
        val constructor = parametersClass.primaryConstructor
            ?: throw IllegalArgumentException("Primary constructor not found for ${parametersClass.simpleName}")
        val arguments = mutableMapOf<KParameter, Any?>()
        for (parameter in constructor.parameters) {
            val jsonValue = jsonElement[parameter.name]
            if (jsonValue != null) {
                val value = convertJsonElementToType(jsonValue, parameter.type.classifier as KClass<*>)
                arguments[parameter] = value
            } else if (!parameter.isOptional) {
                throw IllegalArgumentException("Missing required parameter: ${parameter.name}")
            }
        }
        return constructor.callBy(arguments)
    }

    private fun convertJsonElementToType(jsonElement: JsonElement, clazz: KClass<*>): Any {
        return when (clazz) {
            Int::class -> jsonElement.jsonPrimitive.int
            String::class -> jsonElement.jsonPrimitive.content
            Boolean::class -> jsonElement.jsonPrimitive.boolean
            Double::class -> jsonElement.jsonPrimitive.double
            Float::class -> jsonElement.jsonPrimitive.float
            Long::class -> jsonElement.jsonPrimitive.long
            else -> {
                createParametersObject(clazz, jsonElement.toString())
            }
        }
    }

    private fun createSystemMessage(date: ZonedDateTime, context: String): String {
        val template = """
            You're a bot Sweetie (Сладенький) in VKontakte.
            David Davtyan created you.
            Today is {datetime}
            Don't use [id|Name] format unless explicitly instructed to do so.
            Text between <| and |> is metadata added by system, NEVER repeat this metadata, it will not be processed by system.
            {chat_context}
            """.trimIndent()
        val replacements = mapOf(
            "{datetime}" to date.format(DateTimeFormatter.ofPattern("dd MMMM yyyy HH:mm:ss O")),
            "{chat_context}" to context
        )
        return replacements.entries.fold(template) { acc, (key, value) ->
            acc.replace(key, value)
        }
    }

    private fun MessageAttachment.getId(): Int? {
        return when (this.type) {
            MessageAttachmentType.AUDIO_MESSAGE -> this.audioMessage.id
            MessageAttachmentType.PHOTO -> this.photo.id
            MessageAttachmentType.DOC -> this.doc.id
            MessageAttachmentType.GIFT -> this.gift.id
            MessageAttachmentType.GRAFFITI -> this.graffiti.id
            MessageAttachmentType.MARKET -> this.market.id
            MessageAttachmentType.POLL -> this.poll.id
            MessageAttachmentType.WALL_REPLY -> this.wallReply.id
            else -> null
        }
    }

    private fun escapeXml(text: String): String {
        return text.replace(Regex("[<>&'\"`\n]")) {
            when (it.value) {
                "<" -> "&lt;"
                ">" -> "&gt;"
                "&" -> "&amp;"
                "'" -> "&apos;"
                "`" -> "&#96;"
                "\"" -> "&quot;"
                "\n" -> "<br>"
                else -> it.value
            }
        }
    }
}