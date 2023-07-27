package space.davids_digital.vk_gpt_bot.orm.service;

import space.davids_digital.vk_gpt_bot.model.VkMessageModel;
import space.davids_digital.vk_gpt_bot.orm.entity.VkMessageEntity;
import space.davids_digital.vk_gpt_bot.orm.repository.VkMessagesRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class VkMessagesOrmService {
    private final VkMessagesRepository vkMessagesRepository;

    public VkMessagesOrmService(VkMessagesRepository vkMessagesRepository) {
        this.vkMessagesRepository = vkMessagesRepository;
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
