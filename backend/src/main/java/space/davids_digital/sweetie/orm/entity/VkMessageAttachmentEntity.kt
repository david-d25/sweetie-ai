package space.davids_digital.sweetie.orm.entity

import jakarta.persistence.*

@Entity
@IdClass(VkMessageAttachmentEntityId::class)
@Table(
    name = "vk_message_attachments",
    indexes = [
        Index(
            name = "vk_message_attachments__conversation_message_id_peer_id_index",
            columnList = "conversation_message_id, peer_id"
        )
    ]
)
class VkMessageAttachmentEntity {
    @Id
    @Column(name = "conversation_message_id")
    var conversationMessageId: Long = 0

    @Id
    @Column(name = "peer_id")
    var peerId: Long = 0

    @Id
    @Column(name = "order_index")
    var orderIndex: Int = 0

    @Column(name = "attachment_dto_json", columnDefinition = "jsonb")
    var attachmentDtoJson: String = ""

    @ManyToOne
    @JoinColumns(
        JoinColumn(
            name = "conversation_message_id",
            referencedColumnName = "conversation_message_id",
            insertable = false,
            updatable = false
        ),
        JoinColumn(
            name = "peer_id",
            referencedColumnName = "peer_id",
            insertable = false,
            updatable = false
        )
    )
    var message: VkMessageEntity? = null
}