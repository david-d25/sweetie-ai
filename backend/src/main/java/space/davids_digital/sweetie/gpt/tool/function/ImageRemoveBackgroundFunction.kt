package space.davids_digital.sweetie.gpt.tool.function

import com.aallam.openai.api.chat.ChatMessage
import com.aallam.openai.api.chat.ImagePart
import com.aallam.openai.api.chat.TextPart
import com.vk.api.sdk.objects.messages.SetActivityType
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.gpt.InvocationContext
import space.davids_digital.sweetie.gpt.tool.function.AssistantFunctionUtils.downloadPhotoAttachment
import space.davids_digital.sweetie.gpt.tool.function.parameter.Description
import space.davids_digital.sweetie.integration.openai.OpenAiUtils.toBase64PngDataUrl
import space.davids_digital.sweetie.integration.stabilityai.StabilityAiService
import space.davids_digital.sweetie.integration.vk.VkMessageService
import space.davids_digital.sweetie.model.VkMessageModel

@Component
class ImageRemoveBackgroundFunction(
    private val vkMessagesService: VkMessageService,
    private val stabilityAiService: StabilityAiService
): AssistantFunction<ImageRemoveBackgroundFunction.ImageRemoveBackgroundParameters> {
    companion object {
        private val log = LoggerFactory.getLogger(ImageRemoveBackgroundFunction::class.java)
    }

    data class ImageRemoveBackgroundParameters(
        @Description("ID of the image to remove background from")
        val imageId: Int
    )

    override fun getName() = "image_remove_background"
    override fun getDescription() = "Removes background from an image using Stable Diffusion"
    override fun getParametersClass() = ImageRemoveBackgroundParameters::class

    override suspend fun call(
        parameters: ImageRemoveBackgroundParameters,
        message: VkMessageModel,
        invocationContext: InvocationContext,
    ): String {
        log.info("Removing background from image with id ${parameters.imageId}")
        vkMessagesService.indicateActivity(message.peerId, SetActivityType.PHOTO)
        val inputImage = invocationContext.downloadPhotoAttachment(parameters.imageId)
        val resultImage = stabilityAiService.removeBackground(inputImage)
        val attachments = vkMessagesService.uploadPhotoAttachment(message.peerId, resultImage)
        invocationContext.addAttachment(attachments)
        invocationContext.appendMessage(
            ChatMessage.Companion.User(listOf(
                TextPart("[INTERNAL] This is the result image:"),
                ImagePart(resultImage.toBase64PngDataUrl())
            )))
        invocationContext.chargeCredits(3)
        return "Image is attached to message."
    }
}