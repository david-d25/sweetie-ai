package space.davids_digital.vk_gpt_bot.orm.entity;

import jakarta.persistence.*;

@Entity
@IdClass(ChatAdminEntityId.class)
@Table(name = "chat_admins")
public class ChatAdminEntity {
    @Id
    @Column(name = "peer_id")
    public long peerId;

    @Id
    @Column(name = "user_id")
    public long userId;
}
