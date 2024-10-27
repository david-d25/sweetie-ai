package space.davids_digital.sweetie.command

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.integration.vk.VkMessageService
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.service.ChatSettingsService

@Component
class SettingsCommand(
    private val vkMessageService: VkMessageService,
    private val chatSettingsService: ChatSettingsService
): Command {
    override fun getNames(): Array<String> {
        return arrayOf("settings")
    }

    override fun getUsage(): String {
        return "settings (...)"
    }

    override fun requiresChatAdmin(): Boolean {
        return true
    }

    override fun requiresAppCeo(): Boolean {
        return false
    }

    override suspend fun handle(commandName: String, rawArguments: String, message: VkMessageModel) {
        val subCommand = rawArguments.split(" ")[0]
        val rest = rawArguments.substring(subCommand.length).trim()
        when (subCommand) {
            "" -> handleDefault(message)
            "set" -> handleSet(message, rest)
            else -> handleHelp(message)
        }
    }

    private fun handleDefault(message: VkMessageModel) {
        val settings = chatSettingsService.getOrCreateDefault(message.peerId)
        with(settings) {
            vkMessageService.send(message.peerId, """
                max_output_tokens=$gptMaxOutputTokens
                max_input_tokens=$gptMaxInputTokens
                temperature=$gptTemperature
                top_p=$gptTopP
                frequency_penalty=$gptFrequencyPenalty
                presence_penalty=$gptPresencePenalty
                process_audio_messages=$processAudioMessages
                tts_voice=$ttsVoice
                tts_speed=$ttsSpeed
            """.trimIndent())
        }
    }

    private suspend fun handleSet(message: VkMessageModel, rest: String) {
        if (rest.isBlank()) {
            handleHelp(message)
            return
        }
        var args = rest.split("=").map { it.trim() }
        if (args.size == 1) {
            args = rest.split(" ").map { it.trim() }.filter { it.isNotBlank() }
        }
        if (args.size != 2) {
            handleHelp(message)
            return
        }
        val settingName = args[0]
        val settingValue = args[1]
        var settings = withContext(Dispatchers.IO) {
            chatSettingsService.getOrCreateDefault(message.peerId)
        }
        try {
            settings = when (settingName) {
                "max_output_tokens" -> settings.copy(gptMaxOutputTokens = settingValue.toInt())
                "max_input_tokens" -> settings.copy(gptMaxInputTokens = settingValue.toInt())
                "temperature" -> settings.copy(gptTemperature = settingValue.toDouble())
                "top_p" -> settings.copy(gptTopP = settingValue.toDouble())
                "frequency_penalty" -> settings.copy(gptFrequencyPenalty = settingValue.toDouble())
                "presence_penalty" -> settings.copy(gptPresencePenalty = settingValue.toDouble())
                "process_audio_messages" -> settings.copy(processAudioMessages = settingValue.toBoolean())
                "tts_voice" -> settings.copy(ttsVoice = settingValue)
                "tts_speed" -> settings.copy(ttsSpeed = settingValue.toDouble())
                else -> {
                    vkMessageService.send(message.peerId, "Нет такой настройки")
                    return
                }
            }
        } catch (e: NumberFormatException) {
            vkMessageService.send(message.peerId, "Надо число")
            return
        }
        if (settings.gptMaxInputTokens < 0 || settings.gptMaxInputTokens > 16384) {
            vkMessageService.send(message.peerId, "Надо число от 0 до 16384")
            return
        }
        if (settings.gptMaxOutputTokens < 1 || settings.gptMaxOutputTokens > 2048) {
            vkMessageService.send(message.peerId, "Надо число от 1 до 2048")
            return
        }
        if (settings.gptTemperature < 0 || settings.gptTemperature > 2) {
            vkMessageService.send(message.peerId, "Надо число от 0 до 2")
            return
        }
        if (settings.gptTopP < 0 || settings.gptTopP > 1) {
            vkMessageService.send(message.peerId, "Надо число от 0 до 1")
            return
        }
        if (settings.gptFrequencyPenalty < 0 || settings.gptFrequencyPenalty > 2) {
            vkMessageService.send(message.peerId, "Надо число от 0 до 2")
            return
        }
        if (settings.gptPresencePenalty < 0 || settings.gptPresencePenalty > 2) {
            vkMessageService.send(message.peerId, "Надо число от 0 до 2")
            return
        }
        if (settings.ttsSpeed < 0.25 || settings.ttsSpeed > 4) {
            vkMessageService.send(message.peerId, "Надо число от 0.25 до 4")
            return
        }
        withContext(Dispatchers.IO) {
            chatSettingsService.updateSettings(message.peerId) {
                settings
            }
        }
        vkMessageService.send(message.peerId, "Ок")
    }

    private fun handleHelp(message: VkMessageModel) {
        vkMessageService.send(message.peerId, """
            Команды:
            /sweet settings
            /sweet settings help
            /sweet settings set (имя)[=](значение)
        """.trimIndent())
    }
}