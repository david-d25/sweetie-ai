package space.davids_digital.sweetie.orm.repository

import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.CrudRepository
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import space.davids_digital.sweetie.orm.entity.VkMessageEntity
import space.davids_digital.sweetie.orm.entity.VkMessageEntityId
import space.davids_digital.sweetie.orm.repository.projection.MessageCountProjection
import java.time.Instant
import java.time.ZonedDateTime

@Repository
interface VkMessageRepository: CrudRepository<VkMessageEntity, VkMessageEntityId> {
    fun findAllByPeerIdAndTimestampIsBetween(peerId: Long, from: Instant, to: Instant): List<VkMessageEntity>

    @Query(
        value = "select date_bin(cast(:n || ' minutes' as interval), timestamp, timestamp '2000-01-01') as time, " +
                "count(*) as count " +
                "from vk_messages " +
                "where timestamp between :from and :to " +
                "and (:peerIdFilter is null or peer_id = :peerIdFilter) " +
                "and (:fromIdFilter is null or from_id = :fromIdFilter) " +
                "group by time order by time", nativeQuery = true
    )
    fun countMessagesGroupedByNMinutesSorted(
        @Param("n") n: Long,
        @Param("from") from: ZonedDateTime?,
        @Param("to") to: ZonedDateTime?,
        @Param("peerIdFilter") peerIdFilter: Long?,
        @Param("fromIdFilter") fromIdFilter: Long?
    ): List<MessageCountProjection>
}
