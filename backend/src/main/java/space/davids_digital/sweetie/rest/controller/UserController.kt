package space.davids_digital.sweetie.rest.controller

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseBody
import org.springframework.web.bind.annotation.RestController
import space.davids_digital.sweetie.integration.vk.VkRestApiService
import space.davids_digital.sweetie.orm.service.UsagePlanOrmService
import space.davids_digital.sweetie.orm.service.VkUserOrmService
import space.davids_digital.sweetie.rest.dto.UserDto
import space.davids_digital.sweetie.rest.mapper.UsagePlanDtoMapper
import space.davids_digital.sweetie.service.SessionService

@RestController
@RequestMapping("/user")
class UserController @Autowired constructor(
    private val vkRestApiService: VkRestApiService,
    private val sessionService: SessionService,
    private val usagePlanOrmService: UsagePlanOrmService,
    private val usagePlanDtoMapper: UsagePlanDtoMapper,
    private val vkUserOrmService: VkUserOrmService
) {
    // todo
    @get:ResponseBody
    @get:GetMapping
    val currentUser: UserDto
        get() {
            val session = sessionService.requireSession()
            val userVkId = session.userVkId
            val user = vkUserOrmService.getById(userVkId)
            val usagePlan = usagePlanOrmService.getOrDefault(user!!.usagePlanId, "default")
            val vkUser = vkRestApiService.getUser(userVkId)
            return UserDto(
                userVkId,
                vkUser.firstName,
                vkUser.lastName,
                user.credits,
                vkUser.photo200,
                user.lastCreditGain,
                usagePlanDtoMapper.modelToDto(usagePlan!!),
                user.usagePlanExpiry
            )
        }
}
