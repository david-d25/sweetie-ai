package space.davids_digital.sweetie.orm.service;

import space.davids_digital.sweetie.model.MessagesChartModel;
import space.davids_digital.sweetie.model.VkMessageModel;
import space.davids_digital.sweetie.orm.entity.VkMessageEntity;
import space.davids_digital.sweetie.orm.repository.VkMessageRepository;
import org.springframework.stereotype.Service;
import space.davids_digital.sweetie.orm.repository.projection.MessageCountProjection;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

@Service
public class VkMessagesOrmService {
    private final VkMessageRepository vkMessageRepository;

    public VkMessagesOrmService(VkMessageRepository vkMessageRepository) {
        this.vkMessageRepository = vkMessageRepository;
    }

    public MessagesChartModel getChart(
            ZonedDateTime from,
            ZonedDateTime to,
            Long peerIdFilter,
            Long fromIdFilter,
            long aggregationPeriodMinutes
    ) {
        List<MessageCountProjection> projections = vkMessageRepository.countMessagesGroupedByNMinutesSorted(
                aggregationPeriodMinutes,
                from,
                to,
                peerIdFilter,
                fromIdFilter
        );
        ZonedDateTime[] labels = new ZonedDateTime[projections.size()];
        long[] counts = new long[projections.size()];
        int i = 0;
        for (MessageCountProjection p : projections) {
            labels[i] = p.getTime().toInstant().atZone(ZoneId.systemDefault());
            counts[i] = p.getCount();
            i++;
        }
        return new MessagesChartModel(
                from,
                to,
                aggregationPeriodMinutes,
                peerIdFilter,
                fromIdFilter,
                labels,
                counts
        );
    }

    public List<VkMessageModel> getMessagesByTime(long peerId, Instant fromTime, Instant toTime) {
        return vkMessageRepository
                .findAllByPeerIdAndTimestampIsBetween(peerId, fromTime, toTime)
                .stream()
                .map(this::toModel)
                .toList();
    }

    private VkMessageModel toModel(VkMessageEntity entity) {
        return new VkMessageModel(
                entity.conversationMessageId,
                entity.peerId,
                entity.fromId,
                entity.timestamp,
                entity.text
        );
    }
}
