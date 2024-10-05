package space.davids_digital.sweetie.orm.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "vk_audio_transcripts")
class VkAudioTranscriptEntity {
    @Id
    @Column(name = "id")
    var id: Int = 0

    @Column(name = "transcript")
    var transcript: String = ""

    @Column(name = "attachment_conversation_message_id")
    var attachmentConversationMessageId: Long = 0

    @Column(name = "attachment_peer_id")
    var attachmentPeerId: Long = 0

    @Column(name = "attachment_order_index")
    var attachmentOrderIndex: Int = 0
}