package space.davids_digital.sweetie.service

import com.vk.api.sdk.objects.messages.Message
import com.vk.api.sdk.objects.messages.MessageAttachmentType
import jakarta.annotation.PostConstruct
import kotlinx.coroutines.runBlocking
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Service
import space.davids_digital.sweetie.command.Command
import space.davids_digital.sweetie.command.CommandException
import space.davids_digital.sweetie.command.CommandRegistry
import space.davids_digital.sweetie.command.EnableCommand
import space.davids_digital.sweetie.integration.vk.VkMessagesService
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.orm.repository.AppCeoRepository
import space.davids_digital.sweetie.orm.repository.ChatAdminRepository

/**
 * Service that handles high-level bot logic.
 * Here, we process incoming messages and decide what to do with them.
 */
@Service
class BotService @Autowired constructor(
    private val vkMessagesService: VkMessagesService,
    private val chatSettingsService: ChatSettingsService,
    private val commandRegistry: CommandRegistry,
    private val appCeoRepository: AppCeoRepository,
    private val chatAdminRepository: ChatAdminRepository,
    private val commandsToRegister: List<Command>,
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
        vkMessagesService.getMessageStream().retry().subscribe({
            onNewMessage(it)
        }, {
            log.error("Error while processing message", it)
        })
    }

    private fun onNewMessage(message: VkMessageModel) {
        log.debug("Received a message")
        if (message.text?.trim()?.startsWith(COMMAND_TRIGGER_WORD) == true) {
            processCommandMessage(message)
        } else if (isPrivateMessagePeerId(message.peerId)) {
            processPrivateMessage(message)
        } else if (isSweetieTagged(message)) {
            processTaggingMessage(message)
        } else if (hasAudioMessage(message)) {
            processAudioMessage(message)
        }
    }

    private fun processCommandMessage(message: VkMessageModel) {
        try {
            processCommandMessageUnsafe(message)
        } catch (e: Exception) {
            log.error("Error while processing command message", e)
            vkMessagesService.send(message.peerId, "(В Сладеньком сломалось что-то важное и он не может ответить)")
        }
    }

    fun processCommandMessageUnsafe(message: VkMessageModel) {
        log.info("Received a command message from peerId=${message.peerId}")
        val peerId = message.peerId
        val fromId = message.fromId
        val chatSettings = chatSettingsService.getOrCreateDefault(peerId)
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
        if (candidate.requiresAppCeo() && !appCeoRepository.existsByUserId(fromId)) {
            return vkMessagesService.send(peerId, "Только CEO Сладенького может это")
        }
        if (candidate.requiresChatAdmin() && !chatAdminRepository.existsByUserIdAndPeerId(fromId, peerId)) {
            return vkMessagesService.send(peerId, "Только админ может это")
        }
        // todo do this normally
        runBlocking {
            try {
                candidate.handle(commandName, argumentsRaw, message)
            } catch (e: CommandException) {
                log.error("Error while handling command", e)
                vkMessagesService.send(peerId, "Не могу это сделать (${e.message})")
            } catch (e: Exception) {
                log.error("Error while handling command", e)
                vkMessagesService.send(peerId, "(В Сладеньком сломалось что-то важное и он не может ответить)")
            }
        }
    }

    private fun processPrivateMessage(message: VkMessageModel) {
        log.info("Received a private message from peerId=${message.peerId}")
        return TODO()
    }

    private fun processTaggingMessage(message: VkMessageModel) {
        log.info("Received a tagging message from peerId=${message.peerId}")
        return TODO()
    }

    private fun processAudioMessage(message: VkMessageModel) {
        log.info("Received an audio message from peerId=${message.peerId}")
        return TODO()
    }

    private fun handleUnknownCommand(message: VkMessageModel) {
        // Maybe try finding similar?
        vkMessagesService.send(message.peerId, "Не знаю эту команду.\nПиши /sweet help")
    }

    private fun hasAudioMessage(message: VkMessageModel): Boolean {
        return message.attachmentDtos.any { it.type == MessageAttachmentType.AUDIO_MESSAGE }
    }

    private fun isSweetieTagged(message: VkMessageModel): Boolean {
        return message.text?.contains(Regex("\\[club${vkGroupId}|.*]")) == true
    }
}