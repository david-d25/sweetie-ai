package space.davids_digital.sweetie.model

import com.vk.api.sdk.objects.messages.MessageAttachment
import java.time.Instant

data class VkMessageModel(
    var conversationMessageId: Long,
    var peerId: Long,
    var fromId: Long,
    var timestamp: Instant?,
    var text: String?,
    var forwardedMessages: List<VkMessageModel>,
    var attachmentDtos: List<MessageAttachment>
)
