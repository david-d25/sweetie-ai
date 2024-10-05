package space.davids_digital.sweetie.orm.entity

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "deferred_vk_messages")
class DeferredVkMessageEntity {
    @Id
    @Column(name = "id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Int = 0

    @Column(name = "peer_id")
    var peerId: Long = 0

    @Column(name = "send_at")
    var sendAt: Instant = Instant.now()

    @Column(name = "text")
    var text: String = ""
}