package space.davids_digital.sweetie.orm.entity

import jakarta.persistence.*
import java.time.Instant

@Entity
@IdClass(VkMessageEntityId::class)
@Table(
    name = "vk_messages",
    indexes = [
        Index(name = "timestamp_index", columnList = "timestamp"),
        Index(name = "peer_id_index", columnList = "peer_id"),
        Index(name = "vk_messages__from_id_index", columnList = "from_id"),
        Index(name = "peer_id_timestamp_index", columnList = "peer_id, timestamp DESC"),
        Index(name = "vk_messages__internal_id_index", columnList = "internal_id")
    ]
)
class VkMessageEntity {
    @Id
    @Column(name = "conversation_message_id")
    var conversationMessageId: Long = 0

    @Id
    @Column(name = "peer_id")
    var peerId: Long = 0

    @Column(name = "from_id")
    var fromId: Long = 0

    @Column(name = "timestamp")
    var timestamp: Instant = Instant.now()

    @Column(name = "text", columnDefinition = "text")
    var text: String? = null

    @OneToMany(fetch = FetchType.EAGER, cascade = [CascadeType.ALL])
    @JoinTable(
        name = "vk_message_forwards",
        joinColumns = [
            JoinColumn(name = "conversation_message_id"),
            JoinColumn(name = "peer_id")
        ],
        inverseJoinColumns = [
            JoinColumn(
                name = "forwarded_conversation_message_id",
                referencedColumnName = "conversation_message_id"
            ),
            JoinColumn(
                name = "forwarded_peer_id",
                referencedColumnName = "peer_id"
            )
        ]
    )
    var forwardMessages: List<VkMessageEntity> = ArrayList()

    @OneToMany(mappedBy = "message", fetch = FetchType.EAGER, cascade = [CascadeType.ALL], orphanRemoval = true)
    @OrderBy("orderIndex")
    var attachments: List<VkMessageAttachmentEntity> = ArrayList()
}
