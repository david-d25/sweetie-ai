package space.davids_digital.vk_gpt_bot.rest.dto;

import java.time.ZonedDateTime;

public record MessagesChartDto(
        ZonedDateTime from,
        ZonedDateTime to,
        long aggregationPeriodMinutes,
        Long peerIdFilter,
        Long fromIdFilter,
        ZonedDateTime[] labels,
        long[] counts
) {}