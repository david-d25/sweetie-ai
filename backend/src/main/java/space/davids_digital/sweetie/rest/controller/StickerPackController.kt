package space.davids_digital.sweetie.rest.controller

import org.springframework.web.bind.annotation.*
import space.davids_digital.sweetie.rest.dto.CreateStickerPackImageRequestDto
import java.awt.Color
import java.awt.Font
import java.awt.Image
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.IOException
import javax.imageio.ImageIO
import kotlin.math.ceil

@RestController
@RequestMapping("/sticker-pack")
class StickerPackController {
    companion object {
        private const val STICKER_SPACING = 10
        private const val TEXT_LINE_HEIGHT = 20
    }

    @PostMapping(value = ["/create-image"], produces = ["image/png"])
    @ResponseBody
    fun getStickerPack(@RequestBody request: CreateStickerPackImageRequestDto): ByteArray {
        return try {
            getStickerPackUnsafe(request)
        } catch (e: IOException) {
            throw RuntimeException(e)
        }
    }

    @Throws(IOException::class)
    private fun getStickerPackUnsafe(@RequestBody request: CreateStickerPackImageRequestDto): ByteArray {
        val stickers = request.stickers
        val columns = request.columns
        val imageWidth = request.imageWidth
        val stickerSize = (imageWidth - (columns + 1) * STICKER_SPACING) / columns
        val rows = ceil(stickers.size.toDouble() / columns).toInt()
        val stickerWithCaptionHeight = stickerSize + TEXT_LINE_HEIGHT
        val imageHeight = rows * stickerWithCaptionHeight + (rows + 1) * STICKER_SPACING
        val combinedImage = BufferedImage(imageWidth, imageHeight, BufferedImage.TYPE_INT_RGB)
        val g = combinedImage.createGraphics()
        g.color = Color.WHITE
        g.fillRect(0, 0, combinedImage.width, combinedImage.height)
        var x = STICKER_SPACING
        var y = STICKER_SPACING
        for (i in stickers.indices) {
            val sticker = stickers[i]
            val stickerImage = ImageIO.read(ByteArrayInputStream(sticker.image))

            // Scale image if needed
            val scaledImage = stickerImage.getScaledInstance(stickerSize, stickerSize, Image.SCALE_SMOOTH)
            g.drawImage(scaledImage, x, y, null)

            // Border around the sticker
            g.color = Color.BLACK
            g.drawRect(x, y, stickerSize, stickerSize)

            // Sticker caption centered
            val caption = sticker.caption
            val font = Font("Arial", Font.PLAIN, 20)
            g.font = font
            val stringWidth = g.fontMetrics.stringWidth(caption)
            val textX = x + (stickerSize - stringWidth) / 2
            g.drawString(caption, textX, y + stickerSize + TEXT_LINE_HEIGHT)

            // Move to the next position
            if ((i + 1) % columns == 0) {
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
