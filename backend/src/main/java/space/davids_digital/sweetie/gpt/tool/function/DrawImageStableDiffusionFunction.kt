package space.davids_digital.sweetie.gpt.tool.function

import com.vk.api.sdk.objects.messages.SetActivityType
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.gpt.InvocationContext
import space.davids_digital.sweetie.gpt.tool.function.parameter.Description
import space.davids_digital.sweetie.gpt.tool.function.parameter.Enum
import space.davids_digital.sweetie.integration.openai.OpenAiUtils.toBase64PngDataUrl
import space.davids_digital.sweetie.integration.openai.dto.ChatMessage
import space.davids_digital.sweetie.integration.openai.dto.ImagePart
import space.davids_digital.sweetie.integration.openai.dto.TextPart
import space.davids_digital.sweetie.integration.stabilityai.StabilityAiService
import space.davids_digital.sweetie.integration.vk.VkMessageService
import space.davids_digital.sweetie.model.VkMessageModel

@Component
class DrawImageStableDiffusionFunction(
    private val vkMessagesService: VkMessageService,
    private val stabilityAiService: StabilityAiService
): AssistantFunction<DrawImageStableDiffusionFunction.ImageDrawParameters> {
    companion object {
        private val log = LoggerFactory.getLogger(DrawImageStableDiffusionFunction::class.java)
    }

    data class ImageDrawParameters(
        @Description("What you wish to see in the output image. A strong, descriptive prompt that clearly defines " +
                "elements, colors, and subjects will lead to better results. English only.")
        val prompt: String,

        @Description("A blurb of text describing what you do NOT wish to see in the output image.")
        val negativePrompt: String? = null,

        @Description("The aspect ratio of the output image. 16:9 by default.")
        @Enum("16:9", "1:1", "21:9", "2:3", "3:2", "4:5", "5:4", "9:16", "9:21")

        val aspectRatio: String = "16:9"
    )

    override fun getName() = "draw_image_sd"
    override fun getDescription() =
        "Draws image using Stable Diffusion. If user provided a reference image, use 'draw_similar' instead."
    override fun getParametersClass() = ImageDrawParameters::class

    override suspend fun call(
        parameters: ImageDrawParameters,
        message: VkMessageModel,
        invocationContext: InvocationContext,
    ): String {
        log.debug("Prompt: ${parameters.prompt}")
        log.debug("Negative prompt: ${parameters.negativePrompt}")
        log.debug("Aspect ratio: ${parameters.aspectRatio}")
        vkMessagesService.indicateActivity(message.peerId, SetActivityType.PHOTO)
        val resultImage = stabilityAiService.generate(
            parameters.prompt,
            parameters.negativePrompt,
            parameters.aspectRatio
        )
        val attachments = vkMessagesService.uploadPhotoAttachment(message.peerId, resultImage)
        invocationContext.addAttachment(attachments)
        invocationContext.appendMessage(
            ChatMessage.user(listOf(
                TextPart("[INTERNAL] This is the result image:"),
                ImagePart(resultImage.toBase64PngDataUrl())
            ))
        )
        invocationContext.chargeCredits(6)
        return "Image is attached to message."
    }
}