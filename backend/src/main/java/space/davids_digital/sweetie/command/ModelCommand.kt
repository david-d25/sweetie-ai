package space.davids_digital.sweetie.command

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.integration.openai.OpenAiService
import space.davids_digital.sweetie.integration.vk.VkMessageService
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.service.ChatSettingsService

@Component
class ModelCommand(
    private val vkMessageService: VkMessageService,
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

    override suspend fun handle(commandName: String, rawArguments: String, message: VkMessageModel) {
        val subCommand = rawArguments.split(" ")[0]
        val subArguments = rawArguments.substring(subCommand.length).trim()
        when (subCommand) {
            "" -> handleShow(message)
            "list" -> handleList(message)
            "set" -> handleSet(message, subArguments)
            else -> handleHelp(message)
        }
    }

    private fun handleShow(message: VkMessageModel) {
        val settings = chatSettingsService.getOrCreateDefault(message.peerId)
        val model = settings.gptModel
        vkMessageService.send(message.peerId, "Использую модель '$model'")
    }

    private suspend fun handleList(message: VkMessageModel) {
        val models = openAiService.getAvailableGptOnlyModels()
        val builder = StringBuilder()
        builder.append("Модели:\n")
        models.forEach {
            builder.append("- ").append(it).append("\n")
        }
        vkMessageService.send(message.peerId, builder.toString())
    }

    private suspend fun handleSet(message: VkMessageModel, modelId: String) {
        if (modelId.isBlank()) {
            handleHelp(message)
            return
        }
        val availableModels = openAiService.getAvailableGptOnlyModels()
        if (!availableModels.contains(modelId)) {
            vkMessageService.send(message.peerId, "Нет такой модели")
            return
        }
        withContext(Dispatchers.IO) {
            chatSettingsService.updateSettings(message.peerId) { copy(gptModel = modelId) }
        }
        log.info("User ${message.fromId} set GPT model in chat ${message.peerId} to '$modelId'")
        vkMessageService.send(message.peerId, "Ок")
    }

    private fun handleHelp(message: VkMessageModel) {
        val text = """
            Команды:
            /sweet model
            /sweet model help
            /sweet model list
            /sweet model set (имя)
        """.trimIndent()
        vkMessageService.send(message.peerId, text)
    }
}