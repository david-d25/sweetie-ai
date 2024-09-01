package space.davids_digital.sweetie.rest.dto;

import java.util.List;

public record CreateStickerPackImageRequestDto(
        int imageWidth,
        int columns,
        List<StickerDto> stickers
) {
    public CreateStickerPackImageRequestDto {
        if (imageWidth <= 0) {
            throw new IllegalArgumentException("Image width must be positive");
        }
        if (columns <= 0) {
            throw new IllegalArgumentException("Columns must be positive");
        }
    }

    public record StickerDto(
            byte[] image,
            String caption
    ) {}
}
