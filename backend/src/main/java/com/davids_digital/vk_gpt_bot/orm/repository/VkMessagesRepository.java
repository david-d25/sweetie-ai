package com.davids_digital.vk_gpt_bot.orm.repository;

import com.davids_digital.vk_gpt_bot.orm.entity.VkMessageEntity;
import com.davids_digital.vk_gpt_bot.orm.entity.VkMessageEntityId;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface VkMessagesRepository extends CrudRepository<VkMessageEntity, VkMessageEntityId> {
    List<VkMessageEntity> findAllByPeerIdAndTimestampIsBetween(long peerId, Instant from, Instant to);
}
