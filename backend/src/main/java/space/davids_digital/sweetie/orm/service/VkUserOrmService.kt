package space.davids_digital.sweetie.orm.service

import org.springframework.stereotype.Service
import space.davids_digital.sweetie.model.VkUserModel
import space.davids_digital.sweetie.orm.entity.VkUserEntity
import space.davids_digital.sweetie.orm.repository.VkUserRepository
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

@Service
class VkUserOrmService(private val repository: VkUserRepository) {
    fun save(user: VkUserModel): VkUserModel {
        return toModel(repository.save(toEntity(user)))
    }

    fun getOrCreateDefault(id: Long): VkUserModel? {
        var user = getById(id)
        if (user == null) {
            user = save(
                VkUserModel(
                    id,
                    "",
                    "",
                    0,
                    ZonedDateTime.from(Instant.EPOCH.atZone(ZoneId.systemDefault())),
                    "default",
                    null
                )
            )
        }
        return user
    }

    fun getById(id: Long): VkUserModel? {
        val userEntity = repository.findById(id).orElse(null) ?: return null
        return toModel(userEntity)
    }

    private fun toModel(entity: VkUserEntity): VkUserModel {
        return VkUserModel(
            entity.id,
            entity.firstName,
            entity.lastName,
            entity.credits,
            entity.lastCreditGain,
            entity.usagePlanId,
            entity.usagePlanExpiry
        )
    }

    private fun toEntity(model: VkUserModel): VkUserEntity {
        val entity = VkUserEntity()
        entity.id = model.id
        entity.firstName = model.firstNameCached
        entity.lastName = model.firstNameCached
        entity.credits = model.credits
        entity.lastCreditGain = model.lastCreditGain
        entity.usagePlanId = model.usagePlanId
        entity.usagePlanExpiry = model.usagePlanExpiry
        return entity
    }
}
