package space.davids_digital.sweetie.orm.repository

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import space.davids_digital.sweetie.orm.entity.VkStickerImageEntity
import space.davids_digital.sweetie.orm.entity.VkStickerImageEntityId

@Repository
interface VkStickerImageRepository: JpaRepository<VkStickerImageEntity, VkStickerImageEntityId>