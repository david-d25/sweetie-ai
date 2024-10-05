package space.davids_digital.sweetie.integration.vk

import org.springframework.stereotype.Service
import space.davids_digital.sweetie.orm.entity.VkStickerImageEntity
import space.davids_digital.sweetie.orm.entity.VkStickerImageEntityId
import space.davids_digital.sweetie.orm.repository.VkStickerImageRepository
import space.davids_digital.sweetie.util.DownloadUtils.download

@Service
class VkStickerService(
    private val vkStickerImageRepository: VkStickerImageRepository
) {
    companion object {
        private const val STICKER_SIZE = 512
    }

    fun getStickerImage(stickerId: Int): ByteArray {
        return vkStickerImageRepository.findById(VkStickerImageEntityId(stickerId, STICKER_SIZE, true))
            .map { it.image }
            .orElseGet {
                val image = download(getStickerUrl(stickerId))
                vkStickerImageRepository.save(VkStickerImageEntity().apply {
                    this.stickerId = stickerId
                    this.size = STICKER_SIZE
                    this.withBackground = true
                    this.image = image
                })
                image
            }
    }

    private fun getStickerUrl(stickerId: Int, size: Int = STICKER_SIZE, withBackground: Boolean = true): String {
        return "https://vk.com/sticker/1-${stickerId}-${size}${if (withBackground) "b" else ""}"
    }
}