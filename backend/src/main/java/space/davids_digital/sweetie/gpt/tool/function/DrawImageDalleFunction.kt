package space.davids_digital.sweetie.gpt.tool.function

import com.aallam.openai.api.chat.ChatMessage
import com.aallam.openai.api.chat.ImagePart
import com.aallam.openai.api.chat.TextPart
import com.vk.api.sdk.objects.messages.SetActivityType
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.gpt.InvocationContext
import space.davids_digital.sweetie.gpt.tool.function.parameter.Description
import space.davids_digital.sweetie.gpt.tool.function.parameter.Enum
import space.davids_digital.sweetie.integration.openai.OpenAiService
import space.davids_digital.sweetie.integration.openai.OpenAiUtils.toBase64PngDataUrl
import space.davids_digital.sweetie.integration.vk.VkMessageService
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.util.DownloadUtils.download

@Component
class DrawImageDalleFunction(
    private val vkMessageService: VkMessageService,
    private val openAiService: OpenAiService
): AssistantFunction<DrawImageDalleFunction.DrawImageLegacyParameters> {
    companion object {
        private val log = LoggerFactory.getLogger(DrawImageDalleFunction::class.java)
    }

    data class DrawImageLegacyParameters(
        @Description("Prompt for the image, english only")
        val prompt: String,
        @Description("Size of the generated image")
        @Enum("1024x1024", "1792x1024", "1024x1792")
        val size: String = "1024x1024",
    )

    override fun getName() = "draw_image_dalle"
    override fun getDescription() = "Draws an image with Dall-E. The image will be visible to you."
    override fun getParametersClass() = DrawImageLegacyParameters::class

    override suspend fun call(
        parameters: DrawImageLegacyParameters,
        message: VkMessageModel,
        invocationContext: InvocationContext,
    ): String {
        log.info("Drawing image with Dall-E")
        vkMessageService.indicateActivity(message.peerId, SetActivityType.PHOTO)
        val url = openAiService.image(parameters.prompt, parameters.size)
        val image = download(url)
        val attachment = vkMessageService.uploadPhotoAttachment(message.peerId, image)
        invocationContext.addAttachment(attachment)
        invocationContext.appendMessage(ChatMessage.Companion.User(listOf(
            TextPart("[INTERNAL] This is the image you have drawn."),
            ImagePart(image.toBase64PngDataUrl())
        )))
        return "Image is attached to message.";
    }
}