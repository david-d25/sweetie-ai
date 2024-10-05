package space.davids_digital.sweetie.gpt.tool.function

import com.vk.api.sdk.objects.messages.MessageAttachmentType
import space.davids_digital.sweetie.gpt.InvocationContext
import space.davids_digital.sweetie.util.DownloadUtils.download

object AssistantFunctionUtils {
    fun InvocationContext.downloadPhotoAttachment(attachmentId: Int): ByteArray {
        val attachment = lookupAttachment(attachmentId) ?: throw IllegalArgumentException("Attachment not found")
        if (attachment.type != MessageAttachmentType.PHOTO) {
            throw IllegalArgumentException("This attachment is not a photo")
        }
        val photo = attachment.photo.sizes.maxBy { it.width } ?: throw IllegalArgumentException("No images found")
        return download(photo.url.toString())
    }
}