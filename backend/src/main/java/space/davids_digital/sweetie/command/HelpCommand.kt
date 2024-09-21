package space.davids_digital.sweetie.command

import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.integration.vk.VkMessagesService
import space.davids_digital.sweetie.model.VkMessageModel

@Component
class HelpCommand(
    @Qualifier("appVersion")
    private val appVersion: String,
    private val commandRegistry: CommandRegistry,
    private val vkMessagesService: VkMessagesService
): Command {
    override fun getNames(): Array<String> {
        return arrayOf("help", "")
    }

    override fun getUsage(): String {
        return "help"
    }

    override fun requiresChatAdmin(): Boolean {
        return false
    }

    override fun requiresAppCeo(): Boolean {
        return false
    }

    override suspend fun handle(commandName: String, rawArguments: String, message: VkMessageModel) {
        val builder = StringBuilder()
        builder.append("Sweetie AI v$appVersion\n")
        builder.append("Вот что можно сделать:\n")
        val userCommands = commandRegistry.getCommands().filter { !it.requiresChatAdmin() && !it.requiresAppCeo() }
        val adminCommands = commandRegistry.getCommands().filter { it.requiresChatAdmin() && !it.requiresAppCeo() }
        val ceoCommands = commandRegistry.getCommands().filter { it.requiresAppCeo() }
        if (userCommands.isNotEmpty()) {
            userCommands.forEach {
                builder.append("/sweet ${it.getUsage()}\n")
            }
        }
        if (adminCommands.isNotEmpty()) {
            builder.append("\nДля админов:\n")
            adminCommands.forEach {
                builder.append("/sweet ${it.getUsage()}\n")
            }
        }
        if (ceoCommands.isNotEmpty()) {
            builder.append("\nДля CEO:\n")
            ceoCommands.forEach {
                builder.append("/sweet ${it.getUsage()}\n")
            }
        }

        vkMessagesService.send(message.peerId, builder.toString())
    }
}