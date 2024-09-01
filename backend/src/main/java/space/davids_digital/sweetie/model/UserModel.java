package space.davids_digital.sweetie.model;

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
