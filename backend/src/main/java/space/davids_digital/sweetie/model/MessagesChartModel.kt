package space.davids_digital.sweetie.model

import java.time.ZonedDateTime

data class MessagesChartModel(
    val from: ZonedDateTime,
    val to: ZonedDateTime,
    val aggregationPeriodMinutes: Long,
    val peerIdFilter: Long,
    val fromIdFilter: Long,
    val labels: Array<ZonedDateTime>,
    val counts: LongArray
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as MessagesChartModel

        if (from != other.from) return false
        if (to != other.to) return false
        if (aggregationPeriodMinutes != other.aggregationPeriodMinutes) return false
        if (peerIdFilter != other.peerIdFilter) return false
        if (fromIdFilter != other.fromIdFilter) return false
        if (!labels.contentEquals(other.labels)) return false
        if (!counts.contentEquals(other.counts)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = from.hashCode()
        result = 31 * result + to.hashCode()
        result = 31 * result + aggregationPeriodMinutes.hashCode()
        result = 31 * result + peerIdFilter.hashCode()
        result = 31 * result + fromIdFilter.hashCode()
        result = 31 * result + labels.contentHashCode()
        result = 31 * result + counts.contentHashCode()
        return result
    }
}
