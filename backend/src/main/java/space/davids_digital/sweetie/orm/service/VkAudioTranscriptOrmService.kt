package space.davids_digital.sweetie.orm.service

import org.springframework.stereotype.Service
import space.davids_digital.sweetie.orm.entity.VkAudioTranscriptEntity
import space.davids_digital.sweetie.orm.repository.VkAudioTranscriptRepository

@Service
class VkAudioTranscriptOrmService(
    private val repository: VkAudioTranscriptRepository
) {
    fun getTranscriptForAudioMessage(audioMessageId: Int): String? {
        return repository.findById(audioMessageId).map { it.transcript }.orElse(null)
    }

    fun saveTranscriptForAudioMessage(
        audioMessageId: Int,
        transcript: String,
        attachmentConversationMessageId: Long,
        attachmentPeerId: Long,
        attachmentOrderIndex: Int
    ) {
        val entity = VkAudioTranscriptEntity()
        entity.id = audioMessageId
        entity.transcript = transcript
        entity.attachmentConversationMessageId = attachmentConversationMessageId
        entity.attachmentPeerId = attachmentPeerId
        entity.attachmentOrderIndex = attachmentOrderIndex
        repository.save(entity)
    }
}