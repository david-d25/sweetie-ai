package space.davids_digital.sweetie.gpt.tool.function

import com.vk.api.sdk.objects.messages.SetActivityType
import io.ktor.util.decodeBase64Bytes
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.gpt.InvocationContext
import space.davids_digital.sweetie.gpt.tool.function.AssistantFunctionUtils.downloadPhotoAttachment
import space.davids_digital.sweetie.gpt.tool.function.parameter.Description
import space.davids_digital.sweetie.gpt.tool.function.parameter.Enum
import space.davids_digital.sweetie.integration.openai.OpenAiService
import space.davids_digital.sweetie.integration.vk.VkMessageService
import space.davids_digital.sweetie.model.VkMessageModel
import java.io.ByteArrayInputStream
import javax.imageio.ImageIO

@Component
class EditImageGptFunction(
    private val vkMessageService: VkMessageService,
    private val openAiService: OpenAiService
): AssistantFunction<EditImageGptFunction.DrawImageLegacyParameters> {
    companion object {
        private val log = LoggerFactory.getLogger(EditImageGptFunction::class.java)
    }

    data class DrawImageLegacyParameters(
        @Description("List of image(s) to edit to input, pass the IDs of the image attachments. If user mentions editing one image using another, pass both IDs and you can reference them in the prompt (i.e. 'first image', 'second image', etc.)")
        val images: List<Int>,
        @Description("A text description of the desired image(s), more details = better (max. 32000 characters)")
        val prompt: String,
//        @Description("Size of the generated image")
//        @Enum("1024x1024", "1536x1024", "1024x1536", "auto")
//        val size: String = "auto",
        @Description("Number of images to generate, 1 to 5")
        val imagesNumber: Int = 1,
    )

    override fun getName() = "edit_image"
    override fun getDescription() = "Edit image"
    override fun getParametersClass() = DrawImageLegacyParameters::class

    override suspend fun call(
        parameters: DrawImageLegacyParameters,
        message: VkMessageModel,
        invocationContext: InvocationContext,
    ): String {
        require(parameters.imagesNumber <= 5) { "Maximum number of images is 5" }
        require(parameters.imagesNumber > 0) { "Minimum number of images is 1" }

        log.info("Editing image, input ${parameters.images.size} images")
        vkMessageService.indicateActivity(message.peerId, SetActivityType.PHOTO)

        val inputImages = parameters.images
            .map { invocationContext.downloadPhotoAttachment(it) }

        vkMessageService.indicateActivity(message.peerId, SetActivityType.PHOTO)

        val base64List = openAiService.editImage(
            inputImages,
            parameters.prompt,
            parameters.imagesNumber,
            "auto",
            "auto"
        )

        val images = base64List.map { it.decodeBase64Bytes() }

        vkMessageService.indicateActivity(message.peerId, SetActivityType.PHOTO)

        val attachments = images.map { image -> vkMessageService.uploadPhotoAttachment(message.peerId, image) }
        attachments.forEach {
            invocationContext.addAttachment(it)
        }
        invocationContext.chargeCredits(3L * images.size)
        return "Image(s) attached"
    }

    private fun ByteArray.detectFormat(): String? {
        ByteArrayInputStream(this).use { stream ->
            val iis = ImageIO.createImageInputStream(stream) ?: return null
            val readers = ImageIO.getImageReaders(iis)
            if (!readers.hasNext()) return null
            val reader = readers.next()
            return reader.formatName.lowercase().also { reader.dispose() }
        }
    }

    private fun ByteArray.toDataUri(): String {
        val format = detectFormat() ?: "octet-stream"
        val mime = when (format) {
            "png"  -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "gif"  -> "image/gif"
            "bmp"  -> "image/bmp"
            "wbmp" -> "image/vnd.wap.wbmp"
            "webp" -> "image/webp"
            else   -> "application/octet-stream"
        }
        val base64 = java.util.Base64.getEncoder().encodeToString(this)
        return "data:$mime;base64,$base64"
    }
}