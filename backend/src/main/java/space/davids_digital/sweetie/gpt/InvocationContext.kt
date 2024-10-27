package space.davids_digital.sweetie.gpt

import com.vk.api.sdk.objects.messages.MessageAttachment
import space.davids_digital.sweetie.integration.openai.dto.ChatMessage

interface InvocationContext {
    fun addAttachment(attachment: MessageAttachment)
    fun requestStop()
    fun appendMessage(message: ChatMessage)
    fun chargeCredits(credits: Long)
    fun lookupAttachment(attachmentId: Int): MessageAttachment?
    fun requestVoiceMode()
}