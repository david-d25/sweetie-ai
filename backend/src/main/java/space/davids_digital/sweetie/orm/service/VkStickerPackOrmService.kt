package space.davids_digital.sweetie.orm.service

import org.springframework.stereotype.Service
import space.davids_digital.sweetie.model.VkStickerPackModel
import space.davids_digital.sweetie.orm.entity.VkStickerPackEntity
import space.davids_digital.sweetie.orm.repository.VkStickerPackRepository

@Service
class VkStickerPackOrmService(
    private val vkStickerPackRepository: VkStickerPackRepository,
) {
    fun getAll(): List<VkStickerPackModel> {
        return vkStickerPackRepository.findAll().map(::toModel)
    }

    fun getById(id: Int): VkStickerPackModel? {
        return vkStickerPackRepository.findById(id).map(::toModel).orElse(null)
    }

    fun getEnabled(): List<VkStickerPackModel> {
        return vkStickerPackRepository.findByEnabled(true).map(::toModel)
    }

    fun getByProductId(productId: Long): VkStickerPackModel? {
        return vkStickerPackRepository.findByProductId(productId)?.let(::toModel)
    }

    fun getByStickerId(stickerId: Int): VkStickerPackModel? {
        return vkStickerPackRepository.findByStickerId(stickerId)?.let(::toModel)
    }

    fun save(model: VkStickerPackModel): VkStickerPackModel {
        return vkStickerPackRepository.save(toEntity(model)).let(::toModel)
    }

    private fun toEntity(model: VkStickerPackModel): VkStickerPackEntity {
        return VkStickerPackEntity().also {
            it.id = model.id
            it.productId = model.productId
            it.name = model.name
            it.description = model.description
            it.firstStickerId = model.firstStickerId
            it.stickerCount = model.stickerCount
            it.enabled = model.enabled
        }
    }

    private fun toModel(entity: VkStickerPackEntity): VkStickerPackModel {
        return VkStickerPackModel(
            id = entity.id,
            productId = entity.productId,
            name = entity.name,
            description = entity.description,
            firstStickerId = entity.firstStickerId,
            stickerCount = entity.stickerCount,
            enabled = entity.enabled,
        )
    }
}