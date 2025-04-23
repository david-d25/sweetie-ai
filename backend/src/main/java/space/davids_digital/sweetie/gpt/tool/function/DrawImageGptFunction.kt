package space.davids_digital.sweetie.gpt.tool.function

import com.vk.api.sdk.objects.messages.SetActivityType
import io.ktor.util.decodeBase64Bytes
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.gpt.InvocationContext
import space.davids_digital.sweetie.gpt.tool.function.parameter.Description
import space.davids_digital.sweetie.gpt.tool.function.parameter.Enum
import space.davids_digital.sweetie.integration.openai.OpenAiService
import space.davids_digital.sweetie.integration.vk.VkMessageService
import space.davids_digital.sweetie.model.VkMessageModel

@Component
class DrawImageGptFunction(
    private val vkMessageService: VkMessageService,
    private val openAiService: OpenAiService
): AssistantFunction<DrawImageGptFunction.DrawImageLegacyParameters> {
    companion object {
        private val log = LoggerFactory.getLogger(DrawImageGptFunction::class.java)
    }

    data class DrawImageLegacyParameters(
        @Description("Prompt for the image, more details = better (max. 32000 characters)")
        val prompt: String,
//        @Description("Size of the generated image")
//        @Enum("1024x1024", "1536x1024", "1024x1536", "auto")
//        val size: String = "auto",
        @Description("Number of images to generate, 1 to 5")
        val imagesNumber: Int = 1,
    )

    override fun getName() = "draw_image"
    override fun getDescription() = "Draws an image"
    override fun getParametersClass() = DrawImageLegacyParameters::class

    override suspend fun call(
        parameters: DrawImageLegacyParameters,
        message: VkMessageModel,
        invocationContext: InvocationContext,
    ): String {
        require(parameters.imagesNumber <= 5) { "Maximum number of images is 5" }
        require(parameters.imagesNumber > 0) { "Minimum number of images is 1" }
        log.info("Drawing image")
        vkMessageService.indicateActivity(message.peerId, SetActivityType.PHOTO)
        val base64List = openAiService.image(parameters.prompt, parameters.imagesNumber, "auto", "auto")
        val images = base64List.map { it.decodeBase64Bytes() }
        val attachments = images.map { image -> vkMessageService.uploadPhotoAttachment(message.peerId, image) }
        attachments.forEach {
            invocationContext.addAttachment(it)
        }
        invocationContext.chargeCredits(3L * attachments.size)
        return "Image(s) attached"
    }
}