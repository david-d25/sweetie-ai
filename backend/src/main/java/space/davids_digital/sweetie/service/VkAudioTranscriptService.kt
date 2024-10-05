package space.davids_digital.sweetie.service

import com.vk.api.sdk.objects.messages.MessageAttachmentType
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import space.davids_digital.sweetie.integration.openai.OpenAiService
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.orm.service.VkAudioTranscriptOrmService
import space.davids_digital.sweetie.util.DownloadUtils.download

@Service
class VkAudioTranscriptService(
    private val openAiService: OpenAiService,
    private val orm: VkAudioTranscriptOrmService
) {
    companion object {
        private val log = LoggerFactory.getLogger(VkAudioTranscriptService::class.java)
    }

    suspend fun getTranscriptForAudioMessage(message: VkMessageModel): String {
        val audioMessageIndex = message.attachmentDtos.indexOfFirst { it.type == MessageAttachmentType.AUDIO_MESSAGE }
        if (audioMessageIndex == -1) {
            throw IllegalArgumentException("Message does not contain audio message")
        }
        val audioMessage = message.attachmentDtos[audioMessageIndex].audioMessage
        orm.getTranscriptForAudioMessage(audioMessage.id)?.let {
            return it
        }
        log.info("Transcribing audio message id ${audioMessage.id}")
        val transcript = openAiService.transcription(download(audioMessage.linkMp3))
        orm.saveTranscriptForAudioMessage(
            audioMessage.id,
            transcript,
            message.conversationMessageId,
            message.peerId,
            audioMessageIndex
        )
        return transcript
    }

    fun getTranscriptIfCached(audioMessageId: Int): String? {
        return orm.getTranscriptForAudioMessage(audioMessageId)
    }
}