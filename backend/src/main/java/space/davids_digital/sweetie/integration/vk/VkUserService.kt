package space.davids_digital.sweetie.integration.vk

import com.vk.api.sdk.client.VkApiClient
import com.vk.api.sdk.client.actors.GroupActor
import com.vk.api.sdk.objects.users.Fields
import org.slf4j.LoggerFactory
import org.springframework.cache.annotation.Cacheable
import org.springframework.stereotype.Service
import space.davids_digital.sweetie.model.VkUserModel
import space.davids_digital.sweetie.orm.service.VkUserOrmService
import space.davids_digital.sweetie.service.UsagePlanService
import java.time.ZonedDateTime

@Service
class VkUserService(
    private val vkApiClient: VkApiClient,
    private val vkGroupActor: GroupActor,
    private val vkUserOrmService: VkUserOrmService,
    private val usagePlanService: UsagePlanService
) {
    companion object {
        private val log = LoggerFactory.getLogger(VkUserService::class.java)
    }

    private val thisBotUser = VkUserModel(
        id = 0,
        firstNameCached = "(me)",
        lastNameCached = "",
        credits = 0,
        lastCreditGain = ZonedDateTime.now(),
        usagePlanId = null,
        usagePlanExpiry = null
    )

    @Cacheable("VkUserService.getUser")
    fun getUser(id: Long): VkUserModel? {
        return try {
            fetchUser(id)
        } catch (e: Exception) {
            log.error("Error while fetching VK user with id $id", e)
            null
        }
    }

    private fun fetchUser(id: Long): VkUserModel {
        if (id > 0) { // Regular user
            log.debug("Fetching VK user with id $id")
            val response = vkApiClient.users().get(vkGroupActor)
                .userIds(id.toString())
                .fields(Fields.FIRST_NAME_NOM, Fields.LAST_NAME_NOM)
                .execute()
            val firstName = response.firstOrNull()?.firstName ?: "(Unknown user)"
            val lastName = response.firstOrNull()?.lastName ?: ""
            return refreshUserData(id, firstName, lastName)
        } else if (id == 0L) { // This bot
            return thisBotUser
        } else { // Group
            log.debug("Fetching VK group with id $id")
            val response = vkApiClient.groups().getByIdObject(vkGroupActor)
                .groupId("club${-id}")
                .execute()
            val groupName = response.groups.firstOrNull()?.screenName ?: ""
            return refreshUserData(id, groupName, "[vk group]")
        }
    }

    private fun refreshUserData(id: Long, firstName: String, lastName: String): VkUserModel {
        val user = vkUserOrmService.getById(id)
        if (user == null) {
            log.info("Saving new user with id $id")
            val usagePlan = usagePlanService.getDefault()
            val newUser = VkUserModel(
                id = id,
                firstNameCached = firstName,
                lastNameCached = lastName,
                credits = usagePlan.maxCredits,
                lastCreditGain = ZonedDateTime.now(),
                usagePlanId = null,
                usagePlanExpiry = null
            )
            vkUserOrmService.save(newUser)
            return newUser
        } else {
            val newUser = user.copy(
                firstNameCached = firstName,
                lastNameCached = lastName
            )
            vkUserOrmService.save(newUser)
            return newUser
        }
    }
}