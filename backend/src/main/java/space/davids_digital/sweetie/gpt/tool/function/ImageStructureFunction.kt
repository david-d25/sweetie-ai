package space.davids_digital.sweetie.gpt.tool.function

//import com.vk.api.sdk.objects.messages.SetActivityType
//import org.slf4j.LoggerFactory
//import org.springframework.stereotype.Component
//import space.davids_digital.sweetie.gpt.InvocationContext
//import space.davids_digital.sweetie.gpt.tool.function.AssistantFunctionUtils.downloadPhotoAttachment
//import space.davids_digital.sweetie.gpt.tool.function.parameter.Description
//import space.davids_digital.sweetie.integration.openai.OpenAiUtils.toBase64PngDataUrl
//import space.davids_digital.sweetie.integration.openai.dto.ChatMessage
//import space.davids_digital.sweetie.integration.openai.dto.ImagePart
//import space.davids_digital.sweetie.integration.openai.dto.TextPart
//import space.davids_digital.sweetie.integration.stabilityai.StabilityAiService
//import space.davids_digital.sweetie.integration.vk.VkMessageService
//import space.davids_digital.sweetie.model.VkMessageModel
//
//@Component
//class ImageStructureFunction(
//    private val vkMessagesService: VkMessageService,
//    private val stabilityAiService: StabilityAiService
//): AssistantFunction<ImageStructureFunction.ImageStructureParameters> {
//    companion object {
//        private val log = LoggerFactory.getLogger(ImageStructureFunction::class.java)
//    }
//
//    data class ImageStructureParameters(
//        @Description("ID of the image to draw similar to")
//        val imageId: Int,
//
//        @Description("What you wish to see in the output image. " +
//                "Describe what you see + add some changing elements to it.")
//        val prompt: String,
//
//        @Description("What you do not wish to see in the output image")
//        val negativePrompt: String? = null,
//
//        @Description("How much influence, or control, the input image has on the generation. " +
//                "Should be a number between 0 and 1. Defaults to 0.7.")
//        val controlStrength: Double = 0.7
//    )
//
//    override fun getName() = "draw_similar"
//    override fun getDescription() = """
//        Generates an image by maintaining the structure of an input image using Stable Diffusion.
//        Call this instead of 'draw' when user provides a reference image to you.
//        """.trimIndent()
//    override fun getParametersClass() = ImageStructureParameters::class
//
//    override suspend fun call(
//        parameters: ImageStructureParameters,
//        message: VkMessageModel,
//        invocationContext: InvocationContext,
//    ): String {
//        log.info("Drawing image with structure from image id ${parameters.imageId}")
//        log.debug("Prompt: '${parameters.prompt}'")
//        log.debug("Negative prompt: '${parameters.negativePrompt}'")
//        log.debug("Control strength: '${parameters.controlStrength}'")
//        vkMessagesService.indicateActivity(message.peerId, SetActivityType.PHOTO)
//        val inputImage = invocationContext.downloadPhotoAttachment(parameters.imageId)
//        val resultImage = stabilityAiService.structure(
//            inputImage,
//            parameters.prompt,
//            parameters.controlStrength,
//            parameters.negativePrompt
//        )
//        val attachments = vkMessagesService.uploadPhotoAttachment(message.peerId, resultImage)
//        invocationContext.addAttachment(attachments)
//        invocationContext.appendMessage(ChatMessage.user(listOf(
//            TextPart("[INTERNAL] This is the result image:"),
//            ImagePart(resultImage.toBase64PngDataUrl())
//        )))
//        invocationContext.chargeCredits(3)
//        return "Image is attached to message."
//    }
//}