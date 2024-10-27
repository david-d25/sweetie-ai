package space.davids_digital.sweetie.gpt.tool.function

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.gpt.InvocationContext
import space.davids_digital.sweetie.gpt.tool.function.parameter.Description
import space.davids_digital.sweetie.integration.openai.OpenAiUtils.toBase64PngDataUrl
import space.davids_digital.sweetie.integration.openai.dto.ChatMessage
import space.davids_digital.sweetie.integration.openai.dto.ImagePart
import space.davids_digital.sweetie.integration.openai.dto.TextPart
import space.davids_digital.sweetie.integration.vk.VkMessageService
import space.davids_digital.sweetie.integration.vk.VkStickerService
import space.davids_digital.sweetie.model.VkMessageModel

@Component
class SendStickerFunction(
    private val vkMessageService: VkMessageService,
    private val vkStickerService: VkStickerService
): AssistantFunction<SendStickerFunction.SendStickerParameters> {
    companion object {
        private val log = LoggerFactory.getLogger(SendStickerFunction::class.java)
    }

    data class SendStickerParameters(
        @Description("Sticker ID to send. To know the ID, use 'list_sticker_packs' and 'see_sticker_pack'.")
        val stickerId: Int,
        @Description("Whether to continue the conversation (send another message) after sending the sticker. False by default.")
        val continueConversation: Boolean = false,
    )

    override fun getName() = "send_sticker"
    override fun getDescription() = """
        Sends a sticker to the chat. 
        Call 'list_sticker_packs' or 'see_sticker_pack' before 'send_sticker' to visually 
        see and choose what sticker to use.
    """.trimIndent()
    override fun getParametersClass() = SendStickerParameters::class

    override suspend fun call(
        parameters: SendStickerParameters,
        message: VkMessageModel,
        invocationContext: InvocationContext
    ): String {
        log.info("Sending sticker ${parameters.stickerId} to peerId = ${message.peerId}")
        vkMessageService.sendSticker(message.peerId, parameters.stickerId)
        if (!parameters.continueConversation) {
            invocationContext.requestStop()
        } else {
            val pseudoMessageText = "[INTERNAL] This is the sticker you have sent."
            invocationContext.appendMessage(ChatMessage.user(listOf(
                TextPart(pseudoMessageText),
                ImagePart(vkStickerService.getStickerImage(parameters.stickerId).toBase64PngDataUrl())
            )))
        }
        return "Sticker sent."
    }
}