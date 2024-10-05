package space.davids_digital.sweetie.model

data class VkStickerPackModel(
    val id: Int,
    val productId: Long,
    val name: String,
    val description: String?,
    val firstStickerId: Int,
    val stickerCount: Int,
    val enabled: Boolean,
)