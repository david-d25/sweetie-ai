package space.davids_digital.sweetie.orm.repository

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import space.davids_digital.sweetie.orm.entity.VkStickerImageEntity
import space.davids_digital.sweetie.orm.entity.VkStickerPackEntity

@Repository
interface VkStickerPackRepository: JpaRepository<VkStickerPackEntity, Int> {
    fun findByEnabled(enabled: Boolean): List<VkStickerPackEntity>
    fun findByProductId(productId: Long): VkStickerPackEntity?
    @Query("select p from VkStickerPackEntity p where ?1 between p.firstStickerId and p.firstStickerId + p.stickerCount - 1")
    fun findByStickerId(stickerId: Int): VkStickerPackEntity?
}