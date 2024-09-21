package space.davids_digital.sweetie.command

import jakarta.transaction.Transactional
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.integration.vk.VkMessagesService
import space.davids_digital.sweetie.integration.vk.VkUtils
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.orm.service.ChatAdminOrmService

@Component
class AdminsCommand(
    private val vkMessagesService: VkMessagesService,
    private val chatAdminOrmService: ChatAdminOrmService
): Command {
    companion object {
        private val log = LoggerFactory.getLogger(AdminsCommand::class.java)
    }

    override fun getNames(): Array<String> {
        return arrayOf("admins", "admin")
    }

    override fun getUsage(): String {
        return "admins (...)"
    }

    override fun requiresChatAdmin(): Boolean {
        return true
    }

    override fun requiresAppCeo(): Boolean {
        return false
    }

    @Transactional
    override suspend fun handle(commandName: String, rawArguments: String, message: VkMessageModel) {
        val subCommand = rawArguments.split(" ").firstOrNull() ?: ""
        val rest = rawArguments.substringAfter(subCommand)
        when (subCommand) {
            "" -> handleList(message)
            "add" -> handleAdd(message, rest)
            "remove" -> handleRemove(message, rest)
            else -> handleHelp(message)
        }
    }

    private fun handleList(message: VkMessageModel) {
        val adminIds = chatAdminOrmService.getAdminUserIds(message.peerId)
        val chatMembers = vkMessagesService.getChatMembers(message.peerId)
        val result = StringBuilder()
        result.append("Над Сладеньким имеют власть:\n")
        adminIds.forEach { adminId ->
            val member = chatMembers.profiles.find { it.id == adminId }
            val group = chatMembers.groups.find { it.id == adminId }
            if (member != null) {
                result.append("- ${member.firstName} ${member.lastName}\n")
            } else if (group != null) {
                result.append("- ${group.name}\n")
            } else {
                result.append("- id$adminId\n")
            }
        }
        if (adminIds.isEmpty()) {
            result.append("Никто :(")
        }
        vkMessagesService.send(message.peerId, result.toString())
    }

    private fun handleAdd(message: VkMessageModel, rest: String) {
        if (rest.isBlank()) {
            return handleHelp(message)
        }
        val memberId = VkUtils.extractMemberId(rest)
            ?: return vkMessagesService.send(message.peerId, "Не могу найти участника")
        val sweetAdmins = chatAdminOrmService.getAdminUserIds(message.peerId)
        if (sweetAdmins.contains(memberId)) {
            return vkMessagesService.send(message.peerId, "Уже админ")
        }
        log.info("Adding admin $memberId to chat ${message.peerId}")
        chatAdminOrmService.addAdmin(message.peerId, memberId)
        vkMessagesService.send(message.peerId, "Ок")
    }

    private fun handleRemove(message: VkMessageModel, rest: String) {
        if (rest.isBlank()) {
            return handleHelp(message)
        }
        val memberId = VkUtils.extractMemberId(rest)
            ?: return vkMessagesService.send(message.peerId, "Не могу найти участника")
        log.info("Removing admin $memberId from chat ${message.peerId}")
        chatAdminOrmService.removeAdmin(message.peerId, memberId)
        vkMessagesService.send(message.peerId, "Ок")
    }

    private fun handleHelp(message: VkMessageModel) {
        vkMessagesService.send(message.peerId, """
            Команды:
            /sweet admins
            /sweet admins help
            /sweet admins add (тег)
            /sweet admins remove (тег)
        """.trimIndent())
    }
}