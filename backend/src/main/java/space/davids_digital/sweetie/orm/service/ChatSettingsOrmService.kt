package space.davids_digital.sweetie.orm.service

import org.springframework.stereotype.Service
import space.davids_digital.sweetie.model.ChatSettingsModel
import space.davids_digital.sweetie.orm.entity.ChatSettingsEntity
import space.davids_digital.sweetie.orm.repository.ChatSettingsRepository

@Service
class ChatSettingsOrmService(
    private val repository: ChatSettingsRepository
) {
    fun findHavingAdmin(adminId: Long): Collection<ChatSettingsModel> {
        return repository.findHavingAdmin(adminId).mapNotNull { toModel(it) }
    }

    fun findByIdAndHavingAdmin(peerId: Long, adminId: Long): ChatSettingsModel? {
        return toModel(repository.findByIdAndHavingAdmin(peerId, adminId))
    }

    fun findById(peerId: Long): ChatSettingsModel? {
        return toModel(repository.findById(peerId).orElse(null))
    }

    fun save(model: ChatSettingsModel): ChatSettingsModel {
        return toModel(repository.save(toEntity(model)))!!
    }

    private fun toEntity(model: ChatSettingsModel): ChatSettingsEntity {
        val entity = ChatSettingsEntity()
        entity.peerId = model.peerId
        entity.name = model.titleCached
        entity.context = model.context
        entity.gptMaxInputTokens = model.gptMaxInputTokens
        entity.gptMaxOutputTokens = model.gptMaxOutputTokens
        entity.gptTemperature = model.gptTemperature
        entity.gptTopP = model.gptTopP
        entity.gptFrequencyPenalty = model.gptFrequencyPenalty
        entity.gptPresencePenalty = model.gptPresencePenalty
        entity.botEnabled = model.botEnabled
        entity.gptModel = model.gptModel
        entity.processAudioMessages = model.processAudioMessages
        entity.ttsVoice = model.ttsVoice
        entity.ttsSpeed = model.ttsSpeed
        return entity
    }

    private fun toModel(entity: ChatSettingsEntity?): ChatSettingsModel? {
        return if (entity == null) {
            null
        } else ChatSettingsModel(
            entity.peerId,
            entity.name,
            entity.context ?: "",
            entity.gptMaxInputTokens,
            entity.gptMaxOutputTokens,
            entity.gptTemperature,
            entity.gptTopP,
            entity.gptFrequencyPenalty,
            entity.gptPresencePenalty,
            entity.botEnabled,
            entity.gptModel,
            entity.processAudioMessages,
            entity.ttsVoice,
            entity.ttsSpeed,
        )
    }
}
