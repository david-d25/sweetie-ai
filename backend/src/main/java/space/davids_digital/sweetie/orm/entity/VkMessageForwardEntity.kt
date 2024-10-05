package space.davids_digital.sweetie.orm.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.IdClass
import jakarta.persistence.Table

@Entity
@IdClass(VkMessageForwardEntityId::class)
@Table(name = "vk_message_forwards")
class VkMessageForwardEntity {
    @Id
    @Column(name = "conversation_message_id")
    var conversationMessageId: Long = 0

    @Id
    @Column(name = "peer_id")
    var peerId: Long = 0

    @Id
    @Column(name = "forwarded_conversation_message_id")
    var forwardedConversationMessageId: Long = 0

    @Id
    @Column(name = "forwarded_peer_id")
    var forwardedPeerId: Long = 0
}