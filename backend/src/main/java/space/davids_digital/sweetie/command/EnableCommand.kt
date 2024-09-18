package space.davids_digital.sweetie.command

import com.vk.api.sdk.objects.messages.Message
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.integration.vk.VkMessagesService
import space.davids_digital.sweetie.service.ChatSettingsService

@Component
class EnableCommand(
    private val vkMessagesService: VkMessagesService,
    private val chatSettingsService: ChatSettingsService
): Command {
    override fun getNames(): Array<String> {
        return arrayOf("enable", "on")
    }

    override fun getUsage(): String {
        return "enable"
    }

    override fun requiresChatAdmin(): Boolean {
        return true
    }

    override fun requiresAppCeo(): Boolean {
        return false
    }

    override suspend fun handle(commandName: String, rawArguments: String, message: Message) {
        withContext(Dispatchers.IO) {
            chatSettingsService.updateSettings(message.peerId) { copy(botEnabled = true) }
        }
        vkMessagesService.send(message.peerId, getRandomBotEnablingPhrase())
    }

    private fun getRandomBotEnablingPhrase(): String {
        val phrases = listOf(
            "Доброе утро, Москва!",
            "Татарам привет, остальным соболезную!",
            "Жители Воронежа, не паникуйте!",
            "Привет, котики мои хорошие!",
            "Привет, мои сладкие!",
            "Ну что, котики, аниме?",
            "И это не шутка.",
            "Всем привет, остальным соболезную.",
            "Привет, булочки мои ржаные!",
            "Привет, хлебушки мои ржаные!",
            "Вот бы вас всех напоить квасом 'Царские Припасы'!",
            "Uwu, owo, nya, nya, nya!",
            "Konnichiwa~",
        )
        return "🟢 Бот включён. ${phrases.random()}"
    }
}