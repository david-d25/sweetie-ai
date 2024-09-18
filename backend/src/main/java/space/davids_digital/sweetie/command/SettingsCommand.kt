package space.davids_digital.sweetie.command

import com.vk.api.sdk.objects.messages.Message
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.integration.vk.VkMessagesService
import space.davids_digital.sweetie.service.ChatSettingsService

@Component
class SettingsCommand(
    private val vkMessagesService: VkMessagesService,
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

    override suspend fun handle(commandName: String, rawArguments: String, message: Message) {
        val subCommand = rawArguments.split(" ")[0]
        val rest = rawArguments.substring(subCommand.length).trim()
        when (subCommand) {
            "" -> handleDefault(message)
            "set" -> handleSet(message, rest)
            else -> handleHelp(message)
        }
    }

    private fun handleDefault(message: Message) {
        val settings = chatSettingsService.getOrCreateDefault(message.peerId)
        with(settings) {
            vkMessagesService.send(message.peerId, """
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

    private suspend fun handleSet(message: Message, rest: String) {
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
                    vkMessagesService.send(message.peerId, "Нет такой настройки")
                    return
                }
            }
        } catch (e: NumberFormatException) {
            vkMessagesService.send(message.peerId, "Надо число")
            return
        }
        if (settings.gptMaxInputTokens < 0 || settings.gptMaxInputTokens > 16384) {
            return vkMessagesService.send(message.peerId, "Надо число от 0 до 16384")
        }
        if (settings.gptMaxOutputTokens < 1 || settings.gptMaxOutputTokens > 2048) {
            return vkMessagesService.send(message.peerId, "Надо число от 1 до 2048")
        }
        if (settings.gptTemperature < 0 || settings.gptTemperature > 2) {
            return vkMessagesService.send(message.peerId, "Надо число от 0 до 2")
        }
        if (settings.gptTopP < 0 || settings.gptTopP > 1) {
            return vkMessagesService.send(message.peerId, "Надо число от 0 до 1")
        }
        if (settings.gptFrequencyPenalty < 0 || settings.gptFrequencyPenalty > 2) {
            return vkMessagesService.send(message.peerId, "Надо число от 0 до 2")
        }
        if (settings.gptPresencePenalty < 0 || settings.gptPresencePenalty > 2) {
            return vkMessagesService.send(message.peerId, "Надо число от 0 до 2")
        }
        if (settings.ttsSpeed < 0.25 || settings.ttsSpeed > 4) {
            return vkMessagesService.send(message.peerId, "Надо число от 0.25 до 4")
        }
        withContext(Dispatchers.IO) {
            chatSettingsService.updateSettings(message.peerId) {
                settings
            }
        }
        vkMessagesService.send(message.peerId, "Ок")
    }

    private fun handleHelp(message: Message) {
        vkMessagesService.send(message.peerId, """
            Команды:
            /sweet settings
            /sweet settings help
            /sweet settings set (имя)[=](значение)
        """.trimIndent())
    }
}