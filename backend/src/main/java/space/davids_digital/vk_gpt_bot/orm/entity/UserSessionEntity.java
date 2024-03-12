package space.davids_digital.vk_gpt_bot.orm.entity;

import jakarta.persistence.*;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_sessions", indexes = {
        @Index(name = "user_sessions__user_vk_id_index", columnList = "user_vk_id")
})
public class UserSessionEntity {
    @Id
    @GeneratedValue
    @Column(name = "id")
    public UUID id;

    @Column(name = "user_vk_id")
    public long userVkId;

    @Column(name = "session_token_encrypted")
    public byte[] sessionTokenEncrypted;

    @Column(name = "vk_access_token_encrypted")
    public byte[] vkAccessTokenEncrypted;

    @Column(name = "vk_access_token_id")
    public String vkAccessTokenId;

    @Column(name = "valid_until")
    public ZonedDateTime validUntil;
}
