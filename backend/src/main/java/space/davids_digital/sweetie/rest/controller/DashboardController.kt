package space.davids_digital.sweetie.rest.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import space.davids_digital.sweetie.integration.vk.VkRestApiService
import space.davids_digital.sweetie.integration.vk.dto.VkConversationDto
import space.davids_digital.sweetie.model.ChatSettingsModel
import space.davids_digital.sweetie.orm.service.ChatSettingsOrmService
import space.davids_digital.sweetie.orm.service.UsagePlanOrmService
import space.davids_digital.sweetie.orm.service.VkUserOrmService
import space.davids_digital.sweetie.rest.dto.DashboardDto
import space.davids_digital.sweetie.rest.dto.UserDto
import space.davids_digital.sweetie.rest.mapper.UsagePlanDtoMapper
import space.davids_digital.sweetie.service.SessionService
import java.util.function.Function
import java.util.stream.Collectors

@RestController
@RequestMapping("/dashboard")
class DashboardController(
    private val vkRestApiService: VkRestApiService,
    private val sessionService: SessionService,
    private val vkUserOrmService: VkUserOrmService,
    private val usagePlanOrmService: UsagePlanOrmService,
    private val usagePlanDtoMapper: UsagePlanDtoMapper,
    private val chatSettingsOrmService: ChatSettingsOrmService
) {
    @GetMapping
    fun getDashboard(): DashboardDto {
        val (_, userVkId) = sessionService.requireSession()
        val user = vkUserOrmService.getOrCreateDefault(userVkId)
        val usagePlan = usagePlanOrmService.getOrDefault(user!!.usagePlanId, "default")
        val vkUser = vkRestApiService.getUser(userVkId)
        val chatSettings = chatSettingsOrmService.findHavingAdmin(userVkId)
        val vkChats = vkRestApiService.getConversations(*chatSettings.map { it.peerId }.toLongArray())
        val peerIdToChat = vkChats.stream().collect(Collectors.toMap(
            { v: VkConversationDto -> v.peer!!.id }, { v: VkConversationDto -> v })
        )
        val chats = chatSettings.stream().map { c: ChatSettingsModel? ->
            val photo =
                if (peerIdToChat.containsKey(c!!.peerId)) if (peerIdToChat[c.peerId]!!.chatSettings != null) if (peerIdToChat[c.peerId]!!.chatSettings!!.photo != null) peerIdToChat[c.peerId]!!.chatSettings!!.photo!!.photo200 else null else null else null
            val title =
                if (peerIdToChat.containsKey(c.peerId)) if (peerIdToChat[c.peerId]!!.chatSettings != null) peerIdToChat[c.peerId]!!.chatSettings!!.title else null else null
            DashboardDto.Chat(
                c.peerId, title!!, photo!!, c.botEnabled
            )
        }.toList()
        val userDto = UserDto(
            userVkId,
            vkUser.firstName ?: "",
            vkUser.lastName ?: "",
            user.credits,
            vkUser.photo200,
            user.lastCreditGain,
            usagePlanDtoMapper.modelToDto(usagePlan!!),
            user.usagePlanExpiry!!
        )
        return DashboardDto(userDto, chats)
    }
}
