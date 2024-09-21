package space.davids_digital.sweetie.orm.entity

import jakarta.persistence.*

@Entity
@IdClass(ChatAdminEntityId::class)
@Table(
    name = "chat_admins",
    indexes = [
        Index(
            name = "chat_admins_peer_id_idx",
            columnList = "peer_id"
        )
    ]
)
class ChatAdminEntity {
    @Id
    @Column(name = "peer_id")
    var peerId: Long = 0

    @Id
    @Column(name = "user_id")
    var userId: Long = 0
}
