package space.davids_digital.sweetie.service

import com.vk.api.sdk.objects.messages.MessageAttachmentType
import jakarta.annotation.PostConstruct
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Service
import space.davids_digital.sweetie.command.Command
import space.davids_digital.sweetie.command.CommandException
import space.davids_digital.sweetie.command.CommandRegistry
import space.davids_digital.sweetie.command.EnableCommand
import space.davids_digital.sweetie.integration.vk.VkMessageService
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.orm.repository.AppCeoRepository
import space.davids_digital.sweetie.orm.repository.ChatAdminRepository

/**
 * Service that handles high-level bot logic.
 * Here, we process incoming messages and decide what to do with them.
 */
@Service
class BotService(
    private val vkMessageService: VkMessageService,
    private val chatSettingsService: ChatSettingsService,
    private val commandRegistry: CommandRegistry,
    private val appCeoRepository: AppCeoRepository,
    private val chatAdminRepository: ChatAdminRepository,
    private val sweetieService: SweetieService,
    private val commandsToRegister: List<Command>,
    private val vkAudioTranscriptService: VkAudioTranscriptService,
    @Qualifier("vkGroupId")
    private val vkGroupId: Long
) {
    companion object {
        private val log = LoggerFactory.getLogger(BotService::class.java)

        const val COMMAND_TRIGGER_WORD = "/sweet"

        fun isPrivateMessagePeerId(peerId: Long): Boolean {
            return peerId <= 2_000_000_000
        }
    }

    @PostConstruct
    fun init() {
        log.info("Initializing BotService")
        commandsToRegister.forEach(commandRegistry::registerCommand)
        vkMessageService.getMessageStream().retry().subscribe({
            onNewMessage(it)
        }, {
            log.error("Error while processing message", it)
        })
    }

    private fun onNewMessage(message: VkMessageModel) {
        log.debug("Received a message")
        runBlocking {
            when {
                isCommandMessage(message)                                   -> processCommandMessage(message)
                isPrivateMessagePeerId(message.peerId)                      -> processPrivateMessage(message)
                isSweetieMentioned(message) || isReplyToSweetie(message)    -> processTaggingMessage(message)
                hasAudioMessage(message)                                    -> processAudioMessage(message)
            }
        }
    }

    private suspend fun processCommandMessage(message: VkMessageModel) {
        try {
            processCommandMessageUnsafe(message)
        } catch (e: Exception) {
            log.error("Error while processing command message", e)
            vkMessageService.send(message.peerId, "(В Сладеньком сломалось что-то важное и он не может ответить)")
        }
    }

    suspend fun processCommandMessageUnsafe(message: VkMessageModel) {
        log.info("Received a command message from peerId=${message.peerId}")
        val peerId = message.peerId
        val fromId = message.fromId
        val chatSettings = withContext(Dispatchers.IO) {
            chatSettingsService.getOrCreateDefault(peerId)
        }
        val text = message.text?.trim()?.removePrefix(COMMAND_TRIGGER_WORD)?.trim() ?: ""
        val commandName = text.split(" ").firstOrNull() ?: ""
        val argumentsRaw = text.removePrefix(commandName).trim()
        val commands = commandRegistry.getCommands()
        val candidate = commands.find { it.getNames().any(commandName::equals) }
        if (!chatSettings.botEnabled && candidate?.javaClass != EnableCommand::class.java) {
            return log.info("Bot is disabled, ignoring command")
        }
        if (candidate == null) {
            return handleUnknownCommand(message)
        }
        val userIsCeo = withContext(Dispatchers.IO) {
            appCeoRepository.existsByUserId(fromId)
        }
        val userIsAdmin = withContext(Dispatchers.IO) {
            chatAdminRepository.existsByUserIdAndPeerId(fromId, peerId)
        }
        if (candidate.requiresAppCeo() && !userIsCeo) {
            vkMessageService.send(peerId, "Только CEO Сладенького может это")
            return
        } else if (candidate.requiresChatAdmin() && !(userIsAdmin || userIsCeo)) {
            vkMessageService.send(peerId, "Только админ может это")
            return
        }
        try {
            candidate.handle(commandName, argumentsRaw, message)
        } catch (e: CommandException) {
            log.error("Error while handling command", e)
            vkMessageService.send(peerId, "Не могу это сделать (${e.message})")
        } catch (e: Exception) {
            log.error("Error while handling command", e)
            vkMessageService.send(peerId, "(В Сладеньком сломалось что-то важное и он не может ответить)")
        }
    }

    private suspend fun processPrivateMessage(message: VkMessageModel) {
        log.info("Received a private message from peerId=${message.peerId}")
        try {
            sweetieService.onMessage(message)
        } catch (e: Exception) {
            log.error("Error while processing private message", e)
            vkMessageService.send(message.peerId, "(В Сладеньком сломалось что-то важное и он не может ответить)")
        }
    }

    private suspend fun processTaggingMessage(message: VkMessageModel) {
        log.info("Received a tagging message from peerId=${message.peerId}")
        try {
            sweetieService.onMessage(message)
        } catch (e: Exception) {
            log.error("Error while processing tagging message", e)
            vkMessageService.send(message.peerId, "(В Сладеньком сломалось что-то важное и он не может ответить)")
        }
    }

    private suspend fun processAudioMessage(message: VkMessageModel) {
        log.info("Received an audio message from peerId=${message.peerId}")
        val transcript = try {
            val settings = withContext(Dispatchers.IO) {
                chatSettingsService.getOrCreateDefault(message.peerId)
            }
            if (!settings.processAudioMessages) {
                log.info("Audio messages processing is disabled, ignoring")
                return
            }
            vkAudioTranscriptService.getTranscriptForAudioMessage(message)
        } catch (e: Exception) {
            log.error("Error while processing audio message", e)
            return
        }
        try {
            val triggerWords = listOf("сладенький", "сладенькие", "sweetie")
            val triggered = triggerWords.any { transcript.startsWith(it, ignoreCase = true) }
            if (triggered) {
                log.info("Audio message contains a mention of Sweetie")
                sweetieService.onMessage(message)
            }
        } catch (e: Exception) {
            log.error("Error while processing audio message", e)
            vkMessageService.send(message.peerId, "(В Сладеньком сломалось что-то важное и он не может ответить)")
        }
    }

    private fun isCommandMessage(message: VkMessageModel): Boolean {
        return message.text?.trim()?.startsWith(COMMAND_TRIGGER_WORD) == true
    }

    private fun isReplyToSweetie(message: VkMessageModel): Boolean {
        return message.forwardedMessages.size == 1 && message.forwardedMessages.first().fromId == -vkGroupId
    }

    private fun handleUnknownCommand(message: VkMessageModel) {
        // Maybe try finding similar?
        vkMessageService.send(message.peerId, "Не знаю эту команду.\nПиши /sweet help")
    }

    private fun hasAudioMessage(message: VkMessageModel): Boolean {
        return message.attachmentDtos.any { it.type == MessageAttachmentType.AUDIO_MESSAGE }
    }

    private fun isSweetieMentioned(message: VkMessageModel): Boolean {
        return message.text?.contains(Regex("\\[club${vkGroupId}\\|.*]")) == true
                || message.text?.lowercase()?.startsWith("сладкий") == true
                || message.text?.lowercase()?.startsWith("сладенький") == true
                || message.text?.lowercase()?.startsWith("свити") == true
    }
}