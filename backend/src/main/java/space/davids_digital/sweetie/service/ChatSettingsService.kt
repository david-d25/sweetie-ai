package space.davids_digital.sweetie.service

import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import space.davids_digital.sweetie.model.ChatSettingsModel
import space.davids_digital.sweetie.orm.service.ChatSettingsOrmService

@Service
class ChatSettingsService(
    private val orm: ChatSettingsOrmService
) {
    @Transactional
    fun getOrCreateDefault(peerId: Long): ChatSettingsModel {
        return orm.findById(peerId) ?: orm.save(createDefaultChatSettings(peerId))
    }

    @Transactional
    fun updateSettings(peerId: Long, updater: ChatSettingsModel.() -> ChatSettingsModel) {
        orm.save(updater(getOrCreateDefault(peerId)))
    }

    // TODO store default chat settings somewhere in the database
    private fun createDefaultChatSettings(peerId: Long): ChatSettingsModel {
        return ChatSettingsModel(
            peerId = peerId,
            titleCached = null,
            context = "",
            gptMaxInputTokens = 2048,
            gptMaxOutputTokens = 1024,
            gptTemperature = 1.0,
            gptTopP = 1.0,
            gptFrequencyPenalty = 0.0,
            gptPresencePenalty = 0.0,
            botEnabled = true,
            gptModel = "gpt-4o",
            processAudioMessages = false,
            ttsVoice = "alloy",
            ttsSpeed = 1.0,
        )
    }
}