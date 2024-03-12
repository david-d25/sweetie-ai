package space.davids_digital.vk_gpt_bot.rest.dto;

public record UsagePlanDto(
        String id,
        String title,
        long maxCredits,
        long creditGainAmount,
        long creditGainPeriodSeconds,
        boolean visible
) {}
