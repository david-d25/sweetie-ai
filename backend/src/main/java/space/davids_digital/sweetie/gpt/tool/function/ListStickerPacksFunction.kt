package space.davids_digital.sweetie.gpt.tool.function

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import space.davids_digital.sweetie.gpt.InvocationContext
import space.davids_digital.sweetie.model.VkMessageModel
import space.davids_digital.sweetie.orm.service.VkStickerPackOrmService

@Component
class ListStickerPacksFunction(
    private val vkStickerPackOrmService: VkStickerPackOrmService
): AssistantFunction<Unit> {
    companion object {
        private val log = LoggerFactory.getLogger(ListStickerPacksFunction::class.java)
    }

    override fun getName() = "list_sticker_packs"
    override fun getDescription() = """
        Shows a list of available sticker packs. 
        "Use 'see_sticker_pack' to see all stickers in a pack and decide which one to send. 
        The sticker list is mainly for internal use and should not be shown to the user. 
    """.trimIndent()
    override fun getParametersClass() = Unit::class

    override suspend fun call(parameters: Unit, message: VkMessageModel, invocationContext: InvocationContext): String {
        val packs = vkStickerPackOrmService.getEnabled()
        log.info("Listing ${packs.size} sticker packs")
        return "Available sticker packs (id, name):\n" + packs.joinToString("\n") { it.id.toString() + ", " + it.name }
    }
}