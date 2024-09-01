package space.davids_digital.sweetie.model;

public record UsagePlanModel(
        String id,
        String title,
        long maxCredits,
        long creditGainAmount,
        long creditGainPeriodSeconds,
        boolean visible
) {}
