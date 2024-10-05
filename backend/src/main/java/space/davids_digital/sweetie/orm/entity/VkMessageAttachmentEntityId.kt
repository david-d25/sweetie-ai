package space.davids_digital.sweetie.orm.entity

import java.io.Serializable

data class VkMessageAttachmentEntityId(
    var conversationMessageId: Long = 0,
    var peerId: Long = 0,
    var orderIndex: Int = 0
): Serializable