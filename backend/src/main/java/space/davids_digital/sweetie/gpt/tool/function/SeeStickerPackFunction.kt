package space.davids_digital.sweetie.gpt.tool.function

import org.springframework.stereotype.Component
import space.davids_digital.sweetie.gpt.InvocationContext
import space.davids_digital.sweetie.gpt.tool.function.parameter.Description
import space.davids_digital.sweetie.integration.openai.OpenAiUtils.toBase64PngDataUrl
import space.davids_digital.sweetie.integration.openai.dto.ChatMessage
import space.davids_digital.sweetie.integration.openai.dto.ImagePart
import space.davids_digital.sweetie.integration.openai.dto.TextPart
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.orm.service.VkStickerPackOrmService
import space.davids_digital.sweetie.service.VkStickerPackService

@Component
class SeeStickerPackFunction(
    private val vkStickerPackOrmService: VkStickerPackOrmService,
    private val vkStickerPackService: VkStickerPackService
): AssistantFunction<SeeStickerPackFunction.SeeStickerPackParameters> {
    data class SeeStickerPackParameters(
        @Description("ID of the sticker pack to see")
        val packId: Long
    )

    override fun getName() = "see_sticker_pack"
    override fun getDescription() = """
        See all stickers in a sticker pack and their IDs. 
        Call this before 'send_sticker'. 
        Sticker pack will only be visible to you. 
    """.trimIndent()
    override fun getParametersClass() = SeeStickerPackParameters::class

    override suspend fun call(
        parameters: SeeStickerPackParameters,
        message: VkMessageModel,
        invocationContext: InvocationContext,
    ): String {
        val pack = vkStickerPackOrmService.getByProductId(parameters.packId)
            ?: return "Sticker pack not found, use 'list_sticker_packs' to see available packs"
        val image = vkStickerPackService.createStickerPackImage(pack.productId)
        invocationContext.appendMessage(ChatMessage.user(listOf(
            TextPart("[INTERNAL] This is the sticker pack you requested."),
            ImagePart(image.toBase64PngDataUrl())
        )))
        return "Sticker pack is shown in an internal message."
    }
}