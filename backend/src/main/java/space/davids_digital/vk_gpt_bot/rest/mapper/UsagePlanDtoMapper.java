package space.davids_digital.vk_gpt_bot.rest.mapper;

import org.springframework.stereotype.Service;
import space.davids_digital.vk_gpt_bot.model.UsagePlanModel;
import space.davids_digital.vk_gpt_bot.rest.dto.UsagePlanDto;

@Service
public class UsagePlanDtoMapper {
    public UsagePlanModel dtoToModel(UsagePlanDto dto) {
        return new UsagePlanModel(
                dto.id(),
                dto.title(),
                dto.maxCredits(),
                dto.creditGainAmount(),
                dto.creditGainPeriodSeconds(),
                dto.visible()
        );
    }

    public UsagePlanDto modelToDto(UsagePlanModel model) {
        return new UsagePlanDto(
                model.id(),
                model.title(),
                model.maxCredits(),
                model.creditGainAmount(),
                model.creditGainPeriodSeconds(),
                model.visible()
        );
    }
}
