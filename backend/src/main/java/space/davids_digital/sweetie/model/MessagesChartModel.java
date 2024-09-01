package space.davids_digital.sweetie.model;

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
