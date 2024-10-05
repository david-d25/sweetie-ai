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
class ImageSketchFunction(
    private val vkMessagesService: VkMessageService,
    private val stabilityAiService: StabilityAiService
): AssistantFunction<ImageSketchFunction.ImageSketchParameters> {
    companion object {
        private val log = LoggerFactory.getLogger(ImageSketchFunction::class.java)
    }

    data class ImageSketchParameters(
        @Description("ID of the image to convert")
        val imageId: Int,
        @Description("What you wish to see in the output image. A strong, descriptive prompt that clearly defines elements, colors, and subjects will lead to better results.")
        val prompt: String,
        @Description("A prompt that describes what you don't want to see in the output image")
        val negativePrompt: String? = null,
        @Description("How much influence, or control, the image has on the generation. Represented as a float between 0 and 1. 0.7 by default.")
        val controlStrength: Double = 0.7,
    )

    override fun getName() = "image_sketch"
    override fun getDescription() = "Turns rough sketch into realistic image using Stable Diffusion"
    override fun getParametersClass() = ImageSketchParameters::class

    override suspend fun call(
        parameters: ImageSketchParameters,
        message: VkMessageModel,
        invocationContext: InvocationContext,
    ): String {
        log.info("Drawing image with sketch from image id ${parameters.imageId}")
        log.debug("Prompt: '${parameters.prompt}'")
        log.debug("Negative prompt: '${parameters.negativePrompt}'")
        log.debug("Control strength: '${parameters.controlStrength}'")
        vkMessagesService.indicateActivity(message.peerId, SetActivityType.PHOTO)
        val inputImage = invocationContext.downloadPhotoAttachment(parameters.imageId)
        val resultImage = stabilityAiService.sketch(
            inputImage,
            parameters.prompt,
            parameters.controlStrength,
            parameters.negativePrompt
        )
        val attachments = vkMessagesService.uploadPhotoAttachment(message.peerId, resultImage)
        invocationContext.addAttachment(attachments)
        invocationContext.appendMessage(ChatMessage.Companion.User(listOf(
            TextPart("[INTERNAL] This is the result image:"),
            ImagePart(resultImage.toBase64PngDataUrl())
        )))
        invocationContext.chargeCredits(3)
        return "Image is attached to message."
    }
}