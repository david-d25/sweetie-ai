package space.davids_digital.sweetie.service

import jakarta.transaction.Transactional
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service
import space.davids_digital.sweetie.integration.openai.OpenAiService
import space.davids_digital.sweetie.model.ChatSettingsModel
import space.davids_digital.sweetie.orm.service.ChatSettingsOrmService
import space.davids_digital.sweetie.rest.dto.ChatSettingsUpdateDto
import space.davids_digital.sweetie.rest.exception.ResourceNotFoundException
import space.davids_digital.sweetie.service.exception.ValidationException
import kotlin.Long

@Service
class ChatService @Autowired constructor(
    private val openAiService: OpenAiService,
    private val sessionService: SessionService,
    private val chatSettingsOrmService: ChatSettingsOrmService
) {
    @Transactional
    suspend fun update(id: Long, updates: ChatSettingsUpdateDto): ChatSettingsModel {
        val session = sessionService.requireSession()
        val (
            peerId,
            titleCached,
            context,
            gptMaxInputTokens,
            gptMaxOutputTokens,
            gptTemperature,
            gptTopP,
            gptFrequencyPenalty,
            gptPresencePenalty,
            botEnabled,
            gptModel,
            processAudioMessages,
            ttsVoice,
            ttsSpeed
        ) = chatSettingsOrmService.findByIdAndHavingAdmin(id, session.userVkId) ?: throw ResourceNotFoundException()
        val newSettings = ChatSettingsModel(
            peerId,
            titleCached,
            updates.context.orElse(context),
            updates.gptMaxInputTokens.orElse(gptMaxInputTokens),
            updates.gptMaxOutputTokens.orElse(gptMaxOutputTokens),
            updates.gptTemperature.orElse(gptTemperature),
            updates.gptTopP.orElse(gptTopP),
            updates.gptFrequencyPenalty.orElse(gptFrequencyPenalty),
            updates.gptPresencePenalty.orElse(gptPresencePenalty),
            updates.botEnabled.orElse(botEnabled),
            updates.gptModel.orElse(gptModel),
            updates.processAudioMessages.orElse(processAudioMessages),
            updates.ttsVoice.orElse(ttsVoice),
            updates.ttsSpeed.orElse(ttsSpeed)
        )
        validateChatSettings(newSettings)
        return chatSettingsOrmService.save(newSettings)
    }

    suspend fun validateChatSettings(settings: ChatSettingsModel) {
        if (settings.context.length > 128000) {
            throw ValidationException("context is too big, max 128000 symbols")
        }
        if (settings.gptMaxInputTokens < 0 || settings.gptMaxInputTokens > 16384) {
            throw ValidationException("gptMaxInputTokens must be in range [0, 16384]")
        }
        if (settings.gptMaxOutputTokens < 1 || settings.gptMaxOutputTokens > 2048) {
            throw ValidationException("gptMaxOutputTokens must be in range [1, 2048]")
        }
        if (settings.gptTemperature < 0 || settings.gptTemperature > 2) {
            throw ValidationException("gptTemperature must be in range [0, 2]")
        }
        if (settings.gptTopP < 0 || settings.gptTopP > 1) {
            throw ValidationException("gptTopP must be in range [0, 1]")
        }
        if (settings.gptFrequencyPenalty < 0 || settings.gptFrequencyPenalty > 2) {
            throw ValidationException("gptFrequencyPenalty must be in range [0, 2]")
        }
        if (settings.gptPresencePenalty < 0 || settings.gptPresencePenalty > 2) {
            throw ValidationException("gptPresencePenalty must be in range [0, 2]")
        }
        if (settings.ttsSpeed < 0.25 || settings.ttsSpeed > 4) {
            throw ValidationException("ttsSpeed must be in range [0.25, 4]")
        }
        if (!openAiService.getAvailableGptOnlyModels().contains(settings.gptModel)) {
            throw ValidationException(
                "gptModel must be one of [${openAiService.getAvailableGptOnlyModels().joinToString(", ")}]"
            )
        }
    }
}
