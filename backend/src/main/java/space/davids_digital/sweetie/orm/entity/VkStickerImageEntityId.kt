package space.davids_digital.sweetie.orm.entity

import java.io.Serializable

data class VkStickerImageEntityId (
    var stickerId: Int = 0,
    var size: Int = 0,
    var withBackground: Boolean = false
): Serializable