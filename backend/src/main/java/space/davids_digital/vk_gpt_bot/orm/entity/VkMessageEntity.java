package space.davids_digital.vk_gpt_bot.orm.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@IdClass(VkMessageEntityId.class)
@Table(name = "vk_messages")
public class VkMessageEntity {
    @Id
    @Column(name = "conversation_message_id")
    public long conversationMessageId;

    @Id
    @Column(name = "peer_id")
    public long peerId;

    @Column(name = "from_id")
    public long fromId;

    @Column(name = "timestamp")
    public Instant timestamp;

    @Column(name = "text")
    public String text;
}
