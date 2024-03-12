package space.davids_digital.vk_gpt_bot.orm.service;

import space.davids_digital.vk_gpt_bot.model.MessagesChartModel;
import space.davids_digital.vk_gpt_bot.model.VkMessageModel;
import space.davids_digital.vk_gpt_bot.orm.entity.VkMessageEntity;
import space.davids_digital.vk_gpt_bot.orm.repository.VkMessagesRepository;
import org.springframework.stereotype.Service;
import space.davids_digital.vk_gpt_bot.orm.repository.projection.MessageCountProjection;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

@Service
public class VkMessagesOrmService {
    private final VkMessagesRepository vkMessagesRepository;

    public VkMessagesOrmService(VkMessagesRepository vkMessagesRepository) {
        this.vkMessagesRepository = vkMessagesRepository;
    }

    public MessagesChartModel getChart(
            ZonedDateTime from,
            ZonedDateTime to,
            Long peerIdFilter,
            Long fromIdFilter,
            long aggregationPeriodMinutes
    ) {
        List<MessageCountProjection> projections = vkMessagesRepository.countMessagesGroupedByNMinutesSorted(
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
        return vkMessagesRepository
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
