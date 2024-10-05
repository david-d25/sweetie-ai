package space.davids_digital.sweetie.command

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.integration.openai.OpenAiService
import space.davids_digital.sweetie.integration.vk.VkMessageService
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.service.ChatSettingsService

@Component
class ContextCommand(
    private val vkMessageService: VkMessageService,
    private val chatSettingsService: ChatSettingsService,
    private val openAiService: OpenAiService
): Command {
    companion object {
        private val log = LoggerFactory.getLogger(ContextCommand::class.java)
    }

    override fun getNames(): Array<String> {
        return arrayOf("context")
    }

    override fun getUsage(): String {
        return "context (...)"
    }

    override fun requiresChatAdmin(): Boolean {
        return true
    }

    override fun requiresAppCeo(): Boolean {
        return false
    }

    override suspend fun handle(commandName: String, rawArguments: String, message: VkMessageModel) {
        val subCommand = rawArguments.split(" ").firstOrNull() ?: ""
        val subArguments = rawArguments.split(" ").drop(1).joinToString(" ")
        when (subCommand) {
            "" -> handleDefault(message)
            "set" -> handleSet(message, subArguments)
            "forget" -> handleForget(message)
            "add" -> handleAdd(message, subArguments)
            "replace" -> handleReplace(message, subArguments)
            "remove" -> handleRemove(message, subArguments)
            else -> handleHelp(message)
        }
    }

    private fun handleDefault(message: VkMessageModel) {
        val settings = chatSettingsService.getOrCreateDefault(message.peerId)
        if (settings.context.isEmpty()) {
            vkMessageService.send(message.peerId, "Нет инструкций")
        } else {
            val contextLines = settings.context.lines().mapIndexed { index, line -> "${index + 1}. $line" }
            vkMessageService.send(message.peerId, "Инструкции:\n" + contextLines.joinToString("\n"))
        }
    }

    private fun handleSet(message: VkMessageModel, rawArguments: String) {
        if (rawArguments.isBlank()) {
            handleHelp(message)
            return
        }
        val settings = chatSettingsService.getOrCreateDefault(message.peerId)
        chatSettingsService.updateSettings(message.peerId) { settings.copy(context = rawArguments) }
        val tokensCount = openAiService.estimateTokenCount(rawArguments, settings.gptModel)
        log.info("User ${message.fromId} set context in chat ${message.peerId}, $tokensCount tokens")
        vkMessageService.send(message.peerId, "Ок ($tokensCount токенов)")
    }

    private fun handleForget(message: VkMessageModel) {
        val settings = chatSettingsService.getOrCreateDefault(message.peerId)
        chatSettingsService.updateSettings(message.peerId) { settings.copy(context = "") }
        log.info("User ${message.fromId} removed context in chat ${message.peerId}")
        vkMessageService.send(message.peerId, "Ок")
    }

    private fun handleAdd(message: VkMessageModel, rawArguments: String) {
        if (rawArguments.isBlank()) {
            handleHelp(message)
            return
        }
        val settings = chatSettingsService.getOrCreateDefault(message.peerId)
        val newContext = settings.context + "\n" + rawArguments
        chatSettingsService.updateSettings(message.peerId) { settings.copy(context = newContext) }
        val tokensCount = openAiService.estimateTokenCount(newContext, settings.gptModel)
        log.info("User ${message.fromId} added context in chat ${message.peerId}, overall $tokensCount tokens")
        vkMessageService.send(message.peerId, "Ок ($tokensCount токенов)")
    }

    private fun handleReplace(message: VkMessageModel, rawArguments: String) {
        val parts = rawArguments.split(" ")
        if (parts.size < 2) {
            handleHelp(message)
            return
        }
        val index = parts[0].toIntOrNull()
        if (index == null) {
            handleHelp(message)
            return
        }
        val text = parts.drop(1).joinToString(" ")
        val settings = chatSettingsService.getOrCreateDefault(message.peerId)
        if (index - 1 !in settings.context.lines().indices) {
            vkMessageService.send(message.peerId, "Нет инструкции с таким номером")
            return
        }
        val newContext = settings.context
            .lines()
            .toMutableList()
            .apply { set(index - 1, text) }
            .joinToString("\n")
        chatSettingsService.updateSettings(message.peerId) { settings.copy(context = newContext) }
        val tokensCount = openAiService.estimateTokenCount(newContext, settings.gptModel)
        log.info("User ${message.fromId} replaced context line in chat ${message.peerId}, overall $tokensCount tokens")
        vkMessageService.send(message.peerId, "Ок ($tokensCount токенов)")
    }

    private fun handleRemove(message: VkMessageModel, rawArguments: String) {
        val index = rawArguments.toIntOrNull()
        if (index == null) {
            handleHelp(message)
            return
        }
        val settings = chatSettingsService.getOrCreateDefault(message.peerId)
        if (index - 1 !in settings.context.lines().indices) {
            vkMessageService.send(message.peerId, "Нет инструкции с таким номером")
            return
        }
        val newContext = settings.context
            .lines()
            .toMutableList()
            .apply { removeAt(index - 1) }
            .joinToString("\n")
        chatSettingsService.updateSettings(message.peerId) { settings.copy(context = newContext) }
        val tokensCount = openAiService.estimateTokenCount(newContext, settings.gptModel)
        log.info("User ${message.fromId} removed context line in chat ${message.peerId}, overall $tokensCount tokens")
        vkMessageService.send(message.peerId, "Ок ($tokensCount токенов)")
    }

    private fun handleHelp(message: VkMessageModel) {
        vkMessageService.send(message.peerId, """
            Команды:
            /sweet context
            /sweet context help
            /sweet context set (текст)
            /sweet context forget
            /sweet context add (текст)
            /sweet context replace (номер) (текст)
            /sweet context remove (номер)
        """.trimIndent())
    }
}