package space.davids_digital.sweetie.rest.mapper

import org.springframework.stereotype.Service
import space.davids_digital.sweetie.model.UsagePlanModel
import space.davids_digital.sweetie.rest.dto.UsagePlanDto

@Service
class UsagePlanDtoMapper {
    fun dtoToModel(dto: UsagePlanDto): UsagePlanModel {
        return UsagePlanModel(
            dto.id,
            dto.title,
            dto.maxCredits,
            dto.creditGainAmount,
            dto.creditGainPeriodSeconds,
            dto.visible
        )
    }

    fun modelToDto(model: UsagePlanModel): UsagePlanDto {
        return UsagePlanDto(
            model.id,
            model.title,
            model.maxCredits,
            model.creditGainAmount,
            model.creditGainPeriodSeconds,
            model.visible
        )
    }
}
