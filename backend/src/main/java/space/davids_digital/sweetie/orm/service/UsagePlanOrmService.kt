package space.davids_digital.sweetie.orm.service

import org.springframework.stereotype.Service
import space.davids_digital.sweetie.model.UsagePlanModel
import space.davids_digital.sweetie.orm.entity.UsagePlanEntity
import space.davids_digital.sweetie.orm.repository.UsagePlanRepository

@Service
class UsagePlanOrmService(private val repository: UsagePlanRepository) {
    fun getById(id: String): UsagePlanModel? {
        return toModel(repository.findById(id).orElse(null))
    }

    fun getOrDefault(id: String?, defaultId: String): UsagePlanModel? {
        return if (id == null) {
            getById(defaultId)
        } else toModel(repository.findById(id).orElseGet { repository.findById(defaultId).orElse(null) })
    }

    fun findAll(): List<UsagePlanModel> {
        return repository.findAll().mapNotNull { toModel(it) }
    }

    private fun toModel(dto: UsagePlanEntity?): UsagePlanModel? {
        return if (dto == null) {
            null
        } else UsagePlanModel(
            dto.id,
            dto.title,
            dto.maxCredits,
            dto.creditGainAmount,
            dto.creditGainPeriodSeconds,
            dto.visible
        )
    }

    private fun toEntity(model: UsagePlanModel?): UsagePlanEntity? {
        if (model == null) {
            return null
        }
        val entity = UsagePlanEntity()
        entity.id = model.id
        entity.title = model.title
        entity.maxCredits = model.maxCredits
        entity.creditGainAmount = model.creditGainAmount
        entity.creditGainPeriodSeconds = model.creditGainPeriodSeconds
        entity.visible = model.visible
        return entity
    }
}
