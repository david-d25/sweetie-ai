package space.davids_digital.vk_gpt_bot.model;

import java.time.ZonedDateTime;

public record UserModel(
        long vkId,
        String firstNameCached,
        String lastNameCached,
        long credits,
        ZonedDateTime lastCreditGain,
        String usagePlanId,
        ZonedDateTime usagePlanExpiry
) {}
