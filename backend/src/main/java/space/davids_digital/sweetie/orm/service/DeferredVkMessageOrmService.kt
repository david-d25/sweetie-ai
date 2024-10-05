package space.davids_digital.sweetie.orm.service

import org.springframework.stereotype.Service
import space.davids_digital.sweetie.model.DeferredVkMessageModel
import space.davids_digital.sweetie.orm.entity.DeferredVkMessageEntity
import space.davids_digital.sweetie.orm.repository.DeferredVkMessageRepository
import java.time.Instant

@Service
class DeferredVkMessageOrmService(
    private val deferredVkMessageRepository: DeferredVkMessageRepository
) {
    fun save(model: DeferredVkMessageModel) {
        deferredVkMessageRepository.save(toEntity(model))
    }

    fun findDueMessages(): List<DeferredVkMessageModel> {
        return deferredVkMessageRepository.findAllBySendAtLessThanEqual(Instant.now())
            .map { toModel(it) }
    }

    private fun toEntity(model: DeferredVkMessageModel): DeferredVkMessageEntity {
        return DeferredVkMessageEntity().also {
            it.id = model.id
            it.peerId = model.peerId
            it.sendAt = model.sendAt
            it.text = model.text
        }
    }

    private fun toModel(entity: DeferredVkMessageEntity): DeferredVkMessageModel {
        return DeferredVkMessageModel(
            id = entity.id,
            peerId = entity.peerId,
            sendAt = entity.sendAt,
            text = entity.text
        )
    }
}