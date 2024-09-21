package space.davids_digital.sweetie.command

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.integration.vk.VkMessagesService
import space.davids_digital.sweetie.integration.vk.VkUtils
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.orm.repository.VkUserRepository

@Component
class GiveCommand(
    private val vkMessagesService: VkMessagesService,
    private val vkUserRepository: VkUserRepository
): Command {
    companion object {
        private val log = LoggerFactory.getLogger(GiveCommand::class.java)
    }

    override fun getNames(): Array<String> {
        return arrayOf("give")
    }

    override fun getUsage(): String {
        return "give (credits_amount) (user)"
    }

    override fun requiresChatAdmin(): Boolean {
        return true
    }

    override fun requiresAppCeo(): Boolean {
        return true
    }

    override suspend fun handle(commandName: String, rawArguments: String, message: VkMessageModel) {
        if (rawArguments.isBlank()) {
            return handleHelp(message)
        }
        val arguments = rawArguments.split(" ")
        val creditsAmount = arguments[0].toIntOrNull() ?: return handleHelp(message)
        val rest = arguments.drop(1).joinToString(" ")

        val memberId: Long?
        if (arguments.size >= 2) {
            memberId = VkUtils.extractMemberId(rest)
            if (memberId == null) {
                return vkMessagesService.send(message.peerId, "Не могу найти участника")
            }
        } else if (message.forwardedMessages.size == 1) {
            memberId = message.forwardedMessages.first().fromId
        } else {
            return handleHelp(message)
        }

        withContext(Dispatchers.IO) {
            vkUserRepository.addCredits(memberId, creditsAmount)
        }
        log.info("User ${message.fromId} gave $creditsAmount credits to $memberId")
        vkMessagesService.send(message.peerId, "✨ Выдаю $creditsAmount кредитов")
    }

    private fun handleHelp(message: VkMessageModel) {
        vkMessagesService.send(message.peerId, """
            Так пиши:
            /sweet give (credits_amount) (user)
            """.trimMargin()
        )
    }
}