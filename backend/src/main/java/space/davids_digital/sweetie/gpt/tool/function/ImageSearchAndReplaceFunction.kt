package space.davids_digital.sweetie.gpt.tool.function

import com.vk.api.sdk.objects.messages.SetActivityType
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.gpt.InvocationContext
import space.davids_digital.sweetie.gpt.tool.function.AssistantFunctionUtils.downloadPhotoAttachment
import space.davids_digital.sweetie.gpt.tool.function.parameter.Description
import space.davids_digital.sweetie.integration.openai.OpenAiUtils.toBase64PngDataUrl
import space.davids_digital.sweetie.integration.openai.dto.ChatMessage
import space.davids_digital.sweetie.integration.openai.dto.ImagePart
import space.davids_digital.sweetie.integration.openai.dto.TextPart
import space.davids_digital.sweetie.integration.stabilityai.StabilityAiService
import space.davids_digital.sweetie.integration.vk.VkMessageService
import space.davids_digital.sweetie.model.VkMessageModel

@Component
class ImageSearchAndReplaceFunction(
    private val vkMessagesService: VkMessageService,
    private val stabilityAiService: StabilityAiService
): AssistantFunction<ImageSearchAndReplaceFunction.ImageSearchAndReplaceParameters> {
    companion object {
        private val log = LoggerFactory.getLogger(ImageSearchAndReplaceFunction::class.java)
    }

    data class ImageSearchAndReplaceParameters(
        @Description("ID of the image to search in")
        val imageId: Int,
        @Description("What you wish to see in the output image. A strong, descriptive prompt that clearly defines " +
                "elements, colors, and subjects will lead to better results.")
        val prompt: String,
        @Description("Short description of what to replace in the image")
        val searchPrompt: String,
        @Description("A blurb of text describing what you do not wish to see in the output image.")
        val negativePrompt: String? = null
    )

    override fun getName() = "image_search_and_replace"
    override fun getDescription() =
        "Searches for an object in an image and replaces it with another object using StabilityAI services."
    override fun getParametersClass() = ImageSearchAndReplaceParameters::class

    override suspend fun call(
        parameters: ImageSearchAndReplaceParameters,
        message: VkMessageModel,
        invocationContext: InvocationContext,
    ): String {
        log.info("Drawing image with sketch from image id ${parameters.imageId}")
        log.debug("Prompt: '${parameters.prompt}'")
        log.debug("Search prompt: '${parameters.searchPrompt}'")
        log.debug("Negative prompt: '${parameters.negativePrompt}'")
        vkMessagesService.indicateActivity(message.peerId, SetActivityType.PHOTO)
        val inputImage = invocationContext.downloadPhotoAttachment(parameters.imageId)
        val resultImage = stabilityAiService.searchAndReplace(
            inputImage,
            parameters.prompt,
            parameters.searchPrompt,
            parameters.negativePrompt
        )
        val attachments = vkMessagesService.uploadPhotoAttachment(message.peerId, resultImage)
        invocationContext.addAttachment(attachments)
        invocationContext.appendMessage(ChatMessage.user(listOf(
            TextPart("[INTERNAL] This is the result image:"),
            ImagePart(resultImage.toBase64PngDataUrl())
        )))
        invocationContext.chargeCredits(3)
        return "Image is attached to message."
    }
}
