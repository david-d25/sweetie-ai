package space.davids_digital.sweetie.orm.entity

import jakarta.persistence.*
import java.time.ZonedDateTime
import java.util.*

@Entity
@Table(
    name = "user_sessions",
    indexes = [
        Index(name = "user_sessions__user_vk_id_index", columnList = "user_vk_id")
    ]
)
class UserSessionEntity {
    @Id
    @GeneratedValue
    @Column(name = "id")
    var id: UUID = UUID.fromString("00000000-0000-0000-0000-000000000000")

    @Column(name = "user_vk_id")
    var userVkId: Long = 0

    @Column(name = "session_token_encrypted")
    var sessionTokenEncrypted: ByteArray = ByteArray(0)

    @Column(name = "vk_access_token_encrypted")
    var vkAccessTokenEncrypted: ByteArray = ByteArray(0)

    @Column(name = "vk_access_token_id")
    var vkAccessTokenId: String = ""

    @Column(name = "valid_until")
    var validUntil: ZonedDateTime = ZonedDateTime.now()
}
