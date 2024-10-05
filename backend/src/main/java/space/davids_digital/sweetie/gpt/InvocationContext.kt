package space.davids_digital.sweetie.gpt

import com.aallam.openai.api.chat.ChatMessage
import com.vk.api.sdk.objects.messages.MessageAttachment

interface InvocationContext {
    fun addAttachment(attachment: MessageAttachment)
    fun requestStop()
    fun appendMessage(message: ChatMessage)
    fun chargeCredits(credits: Long)
    fun lookupAttachment(attachmentId: Int): MessageAttachment?
}