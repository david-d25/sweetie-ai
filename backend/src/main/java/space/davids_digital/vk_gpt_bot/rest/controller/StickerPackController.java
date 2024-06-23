package space.davids_digital.vk_gpt_bot.rest.controller;

import org.springframework.web.bind.annotation.*;
import space.davids_digital.vk_gpt_bot.rest.dto.CreateStickerPackImageRequestDto;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/sticker-pack")
public class StickerPackController {
    private static final int STICKER_SPACING = 10;
    private static final int TEXT_LINE_HEIGHT = 20;

    @PostMapping(value = "/create-image", produces = "image/png")
    @ResponseBody
    public byte[] getStickerPack(@RequestBody CreateStickerPackImageRequestDto request) {
        try {
            return getStickerPackUnsafe(request);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    private byte[] getStickerPackUnsafe(@RequestBody CreateStickerPackImageRequestDto request) throws IOException {
        List<CreateStickerPackImageRequestDto.StickerDto> stickers = request.stickers();
        int columns = request.columns();
        int imageWidth = request.imageWidth();
        int stickerSize = (imageWidth - (columns + 1) * STICKER_SPACING) / columns;
        int rows = (int) Math.ceil((double) stickers.size() / columns);
        int stickerWithCaptionHeight = stickerSize + TEXT_LINE_HEIGHT;
        int imageHeight = rows * stickerWithCaptionHeight + (rows + 1) * STICKER_SPACING;

        BufferedImage combinedImage = new BufferedImage(imageWidth, imageHeight, BufferedImage.TYPE_INT_RGB);

        Graphics2D g = combinedImage.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, combinedImage.getWidth(), combinedImage.getHeight());
        int x = STICKER_SPACING;
        int y = STICKER_SPACING;
        for (int i = 0; i < stickers.size(); i++) {
            CreateStickerPackImageRequestDto.StickerDto sticker = stickers.get(i);
            BufferedImage stickerImage = ImageIO.read(new ByteArrayInputStream(sticker.image()));

            // Scale image if needed
            Image scaledImage = stickerImage.getScaledInstance(stickerSize, stickerSize, Image.SCALE_SMOOTH);
            g.drawImage(scaledImage, x, y, null);

            // Border around the sticker
            g.setColor(Color.BLACK);
            g.drawRect(x, y, stickerSize, stickerSize);

            // Sticker caption centered
            String caption = sticker.caption();
            Font font = new Font("Arial", Font.PLAIN, 20);
            g.setFont(font);
            int stringWidth = g.getFontMetrics().stringWidth(caption);
            int textX = x + (stickerSize - stringWidth) / 2;
            g.drawString(caption, textX, y + stickerSize + TEXT_LINE_HEIGHT);

            // Move to the next position
            if ((i + 1) % columns == 0) {
                x = STICKER_SPACING;
                y += stickerSize + STICKER_SPACING + TEXT_LINE_HEIGHT;
            } else {
                x += stickerSize + STICKER_SPACING;
            }
        }
        g.dispose();

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(combinedImage, "png", output);
        return output.toByteArray();
    }
}
