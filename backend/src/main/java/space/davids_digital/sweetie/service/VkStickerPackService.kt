package space.davids_digital.sweetie.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import space.davids_digital.sweetie.integration.vk.VkStickerService
import space.davids_digital.sweetie.orm.service.VkStickerPackOrmService
import java.awt.Color
import java.awt.Font
import java.awt.Image
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO
import kotlin.math.ceil

@Service
class VkStickerPackService(
    private val vkStickerPackOrmService: VkStickerPackOrmService,
    private val vkStickerService: VkStickerService,
) {
    companion object {
        private val log = LoggerFactory.getLogger(VkStickerPackService::class.java)
        private const val IMAGE_WIDTH = 1024
        private const val COLUMNS = 6
        private const val STICKER_SPACING = 10
        private const val TEXT_LINE_HEIGHT = 20
    }

    fun createStickerPackImage(productId: Long): ByteArray {
        val pack = vkStickerPackOrmService.getByProductId(productId)
            ?: throw IllegalArgumentException("Sticker pack not found")
        log.info("Creating image for sticker pack ${pack.id} (${pack.name})")
        val stickerIds = (pack.firstStickerId ..< pack.firstStickerId + pack.stickerCount).toList()
        val stickerImages = stickerIds.map { vkStickerService.getStickerImage(it) }.toList()
        val stickerSize = (IMAGE_WIDTH - (COLUMNS + 1) * STICKER_SPACING) / COLUMNS
        val rows = ceil(stickerImages.size.toDouble() / COLUMNS).toInt()
        val stickerWithCaptionHeight = stickerSize + TEXT_LINE_HEIGHT
        val imageHeight = rows * stickerWithCaptionHeight + (rows + 1) * STICKER_SPACING
        val combinedImage = BufferedImage(IMAGE_WIDTH, imageHeight, BufferedImage.TYPE_INT_RGB)
        val g = combinedImage.createGraphics()
        g.color = Color.WHITE
        g.fillRect(0, 0, combinedImage.width, combinedImage.height)
        var x = STICKER_SPACING
        var y = STICKER_SPACING
        for (i in stickerImages.indices) {
            val stickerImage = ImageIO.read(ByteArrayInputStream(stickerImages[i]))

            // Scale image if needed
            val scaledImage = stickerImage.getScaledInstance(stickerSize, stickerSize, Image.SCALE_SMOOTH)
            g.drawImage(scaledImage, x, y, null)

            // Border around the sticker
            g.color = Color.BLACK
            g.drawRect(x, y, stickerSize, stickerSize)

            // Sticker caption centered
            val caption = "id " + stickerIds[i]
            val font = Font("Arial", Font.PLAIN, 20)
            g.font = font
            val stringWidth = g.fontMetrics.stringWidth(caption)
            val textX = x + (stickerSize - stringWidth) / 2
            g.drawString(caption, textX, y + stickerSize + TEXT_LINE_HEIGHT)

            // Move to the next position
            if ((i + 1) % COLUMNS == 0) {
                x = STICKER_SPACING
                y += stickerSize + STICKER_SPACING + TEXT_LINE_HEIGHT
            } else {
                x += stickerSize + STICKER_SPACING
            }
        }
        g.dispose()
        val output = ByteArrayOutputStream()
        ImageIO.write(combinedImage, "png", output)
        return output.toByteArray()
    }
}