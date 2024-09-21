package space.davids_digital.sweetie.rest.dto;

import java.time.ZonedDateTime;

public record UserDto(
        long vkId,
        String firstName,
        String lastName,
        long credits,
        String photoUrl,
        ZonedDateTime lastCreditGain,
        UsagePlanDto usagePlan,
        ZonedDateTime usagePlanExpiry
) {}
