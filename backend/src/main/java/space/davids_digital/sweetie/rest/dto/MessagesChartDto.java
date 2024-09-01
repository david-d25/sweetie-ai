package space.davids_digital.sweetie.rest.dto;

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