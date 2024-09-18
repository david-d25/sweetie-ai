package space.davids_digital.sweetie.command

import com.vk.api.sdk.objects.messages.Message
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.integration.openai.OpenAiService
import space.davids_digital.sweetie.integration.vk.VkMessagesService
import space.davids_digital.sweetie.service.ChatSettingsService

@Component
class ModelCommand(
    private val vkMessagesService: VkMessagesService,
    private val chatSettingsService: ChatSettingsService,
    private val openAiService: OpenAiService
): Command {
    companion object {
        private val log = LoggerFactory.getLogger(ModelCommand::class.java)
    }

    override fun getNames(): Array<String> {
        return arrayOf("model")
    }

    override fun getUsage(): String {
        return "model model (...)"
    }

    override fun requiresChatAdmin(): Boolean {
        return true
    }

    override fun requiresAppCeo(): Boolean {
        return false
    }

    override suspend fun handle(commandName: String, rawArguments: String, message: Message) {
        val subCommand = rawArguments.split(" ")[0]
        val subArguments = rawArguments.substring(subCommand.length).trim()
        when (subCommand) {
            "" -> handleShow(message)
            "list" -> handleList(message)
            "set" -> handleSet(message, subArguments)
            else -> handleHelp(message)
        }
    }

    private fun handleShow(message: Message) {
        val settings = chatSettingsService.getOrCreateDefault(message.peerId)
        val model = settings.gptModel
        vkMessagesService.send(message.peerId, "Использую модель '$model'")
    }

    private suspend fun handleList(message: Message) {
        val models = openAiService.getAvailableGptOnlyModels()
        val builder = StringBuilder()
        builder.append("Модели:\n")
        models.forEach {
            builder.append("- ").append(it).append("\n")
        }
        vkMessagesService.send(message.peerId, builder.toString())
    }

    private suspend fun handleSet(message: Message, modelId: String) {
        if (modelId.isBlank()) {
            handleHelp(message)
            return
        }
        val availableModels = openAiService.getAvailableGptOnlyModels()
        if (!availableModels.contains(modelId)) {
            vkMessagesService.send(message.peerId, "Нет такой модели")
            return
        }
        withContext(Dispatchers.IO) {
            chatSettingsService.updateSettings(message.peerId) { copy(gptModel = modelId) }
        }
        log.info("User ${message.fromId} set GPT model in chat ${message.peerId} to '$modelId'")
        vkMessagesService.send(message.peerId, "Ок")
    }

    private fun handleHelp(message: Message) {
        val text = """
            Команды:
            /sweet model
            /sweet model help
            /sweet model list
            /sweet model set (имя)
        """.trimIndent()
        vkMessagesService.send(message.peerId, text)
    }
}