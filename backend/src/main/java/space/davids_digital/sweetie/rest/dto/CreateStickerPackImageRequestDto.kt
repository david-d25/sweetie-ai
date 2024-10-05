package space.davids_digital.sweetie.rest.dto

data class CreateStickerPackImageRequestDto(
    val imageWidth: Int,
    val columns: Int,
    val stickers: List<StickerDto>
) {
    data class StickerDto(val image: ByteArray, val caption: String) {
        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (javaClass != other?.javaClass) return false

            other as StickerDto

            if (!image.contentEquals(other.image)) return false
            if (caption != other.caption) return false

            return true
        }

        override fun hashCode(): Int {
            var result = image.contentHashCode()
            result = 31 * result + caption.hashCode()
            return result
        }
    }

    init {
        require(imageWidth > 0) { "Image width must be positive" }
        require(columns > 0) { "Columns must be positive" }
    }
}
