package space.davids_digital.sweetie.gpt.tool.function

import org.springframework.stereotype.Component
import space.davids_digital.sweetie.gpt.InvocationContext
import space.davids_digital.sweetie.integration.vk.VkMessageService
import space.davids_digital.sweetie.model.VkMessageModel

@Component
class GetUsersListFunction(
    private val vkMessageService: VkMessageService
): AssistantFunction<Unit> {
    override fun getName() = "get_users_list"
    override fun getDescription() = "Gets list of all users in this chat."
    override fun getParametersClass() = Unit::class

    override suspend fun call(parameters: Unit, message: VkMessageModel, invocationContext: InvocationContext): String {
        val members = vkMessageService.getChatMembers(message.peerId)
        val itemByMemberId = members.items.associateBy { it.memberId }
        val result = StringBuilder()
        result.append("Member ID,Type,Name,Is Admin\n")
        members.groups.forEach {
            result.append("${it.id},group,${it.name},true\n")
        }
        members.profiles.forEach {
            result.append("${it.id},user,${it.firstName} ${it.lastName},${itemByMemberId[it.id]?.isAdmin}\n")
        }
        return result.toString()
    }
}