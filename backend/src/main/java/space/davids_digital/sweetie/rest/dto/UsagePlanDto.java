package space.davids_digital.sweetie.rest.dto;

public record UsagePlanDto(
        String id,
        String title,
        long maxCredits,
        long creditGainAmount,
        long creditGainPeriodSeconds,
        boolean visible
) {}
