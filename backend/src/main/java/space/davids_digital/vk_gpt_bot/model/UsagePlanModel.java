package space.davids_digital.vk_gpt_bot.model;

public record UsagePlanModel(
        String id,
        String title,
        long maxCredits,
        long creditGainAmount,
        long creditGainPeriodSeconds,
        boolean visible
) {}
