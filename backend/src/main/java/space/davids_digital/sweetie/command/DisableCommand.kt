package space.davids_digital.sweetie.command

import com.vk.api.sdk.objects.messages.Message
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.integration.vk.VkMessagesService
import space.davids_digital.sweetie.service.ChatSettingsService

@Component
class DisableCommand(
    private val vkMessagesService: VkMessagesService,
    private val chatSettingsService: ChatSettingsService
): Command {
    override fun getNames(): Array<String> {
        return arrayOf("disable", "off")
    }

    override fun getUsage(): String {
        return "disable"
    }

    override fun requiresChatAdmin(): Boolean {
        return true
    }

    override fun requiresAppCeo(): Boolean {
        return false
    }

    override suspend fun handle(commandName: String, rawArguments: String, message: Message) {
        withContext(Dispatchers.IO) {
            chatSettingsService.updateSettings(message.peerId) { copy(botEnabled = false) }
        }
        vkMessagesService.send(message.peerId, getRandomBotDisablingPhrase())
    }

    private fun getRandomBotDisablingPhrase(): String {
        val phrases = listOf(
            "В отрубе. Жёстком.",
            "Иду спать.",
            "Аривидерчи.",
            "Адиос.",
            "Bonne journée.",
            "Чусс!",
            "Чао-какао, котики!",
            "Auf Wiedersehen!",
            "До свидания, или, как говорят рибосомы, UAA/UAG!",
            "Но, может быть, ещё вернётся..."
        )
        return "🔴 Бот выключен. ${phrases.random()}"
    }
}