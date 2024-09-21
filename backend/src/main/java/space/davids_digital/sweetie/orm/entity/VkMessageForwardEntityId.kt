package space.davids_digital.sweetie.orm.entity

import java.io.Serializable

data class VkMessageForwardEntityId(
    var conversationMessageId: Long,
    var peerId: Long,
    var forwardedConversationMessageId: Long,
    var forwardedPeerId: Long
): Serializable {
    constructor(): this(0, 0, 0, 0)
}