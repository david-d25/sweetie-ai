package space.davids_digital.vk_gpt_bot.model;

import java.time.ZonedDateTime;

public record MessagesChartModel(
        ZonedDateTime from,
        ZonedDateTime to,
        long aggregationPeriodMinutes,
        Long peerIdFilter,
        Long fromIdFilter,
        ZonedDateTime[] labels,
        long[] counts
) {}
