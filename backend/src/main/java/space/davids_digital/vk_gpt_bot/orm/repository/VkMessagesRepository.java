package space.davids_digital.vk_gpt_bot.orm.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import space.davids_digital.vk_gpt_bot.orm.entity.VkMessageEntity;
import space.davids_digital.vk_gpt_bot.orm.entity.VkMessageEntityId;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;
import space.davids_digital.vk_gpt_bot.orm.repository.projection.MessageCountProjection;

import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.List;

@Repository
public interface VkMessagesRepository extends CrudRepository<VkMessageEntity, VkMessageEntityId> {
    List<VkMessageEntity> findAllByPeerIdAndTimestampIsBetween(long peerId, Instant from, Instant to);

    @Query(
            value = "select date_bin(cast(:n || ' minutes' as interval), timestamp, timestamp '2000-01-01') as time, " +
                    "count(*) as count " +
                    "from vk_messages " +
                    "where timestamp between :from and :to " +
                    "and (:peerIdFilter is null or peer_id = :peerIdFilter) " +
                    "and (:fromIdFilter is null or from_id = :fromIdFilter) " +
                    "group by time order by time",
            nativeQuery = true
    )
    List<MessageCountProjection> countMessagesGroupedByNMinutesSorted(
            @Param("n") long n,
            @Param("from") ZonedDateTime from,
            @Param("to") ZonedDateTime to,
            @Param("peerIdFilter") Long peerIdFilter,
            @Param("fromIdFilter") Long fromIdFilter
    );
}
