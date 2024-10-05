package space.davids_digital.sweetie.orm.entity

import java.io.Serializable

data class VkMessageEntityId(
    var conversationMessageId: Long = 0,
    var peerId: Long = 0
): Serializable {
    constructor(): this(0, 0)
}
