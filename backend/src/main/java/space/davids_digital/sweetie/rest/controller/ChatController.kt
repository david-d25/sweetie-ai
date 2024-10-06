package space.davids_digital.sweetie.rest.controller

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.web.bind.annotation.*
import space.davids_digital.sweetie.integration.openai.OpenAiService
import space.davids_digital.sweetie.integration.vk.VkRestApiService
import space.davids_digital.sweetie.integration.vk.dto.VkConversationDto
import space.davids_digital.sweetie.model.ChatSettingsModel
import space.davids_digital.sweetie.orm.service.ChatSettingsOrmService
import space.davids_digital.sweetie.rest.dto.ChatDto
import space.davids_digital.sweetie.rest.dto.ChatSettingsUpdateDto
import space.davids_digital.sweetie.rest.exception.ResourceNotFoundException
import space.davids_digital.sweetie.service.ChatService
import space.davids_digital.sweetie.service.SessionService

@RestController
@RequestMapping("/chat")
class ChatController @Autowired constructor(
    private val chatService: ChatService,
    private val vkRestApiService: VkRestApiService,
    private val openAiService: OpenAiService,
    private val sessionService: SessionService,
    private val chatSettingsOrmService: ChatSettingsOrmService
) {
    @GetMapping("/{id}")
    @ResponseBody
    suspend fun getChat(@PathVariable("id") id: Long): ChatDto {
        val session = sessionService.requireSession()
        val chatSettings = chatSettingsOrmService.findByIdAndHavingAdmin(id, session.userVkId)
            ?: throw ResourceNotFoundException()
        val vkChat = vkRestApiService.getConversations(chatSettings.peerId).stream().findFirst().orElse(null)
        return createChatDto(chatSettings, vkChat, openAiService.getAvailableGptOnlyModels())
    }

    @PostMapping("/{id}")
    @ResponseBody
    suspend fun updateChatSettings(@PathVariable("id") id: Long, @RequestBody dto: ChatSettingsUpdateDto): ChatDto {
        val session = sessionService.requireSession()
        val chatSettings = chatSettingsOrmService.findByIdAndHavingAdmin(id, session.userVkId)
            ?: throw ResourceNotFoundException()
        val vkChat = vkRestApiService.getConversations(chatSettings.peerId).stream().findFirst().orElse(null)
        return createChatDto(chatService.update(id, dto), vkChat, openAiService.getAvailableGptOnlyModels())
    }

    private fun createChatDto(
        chatSettings: ChatSettingsModel,
        vkChat: VkConversationDto?,
        availableModels: List<String>
    ): ChatDto {
        return ChatDto(
            chatSettings.peerId,
            vkChat?.chatSettings?.title,
            vkChat?.chatSettings?.photo?.photo200,
            chatSettings.botEnabled,
            chatSettings.context,
            chatSettings.gptMaxInputTokens.toLong(),
            chatSettings.gptMaxOutputTokens.toLong(),
            chatSettings.gptTemperature,
            chatSettings.gptTopP,
            chatSettings.gptFrequencyPenalty,
            chatSettings.gptPresencePenalty,
            chatSettings.gptModel,
            chatSettings.processAudioMessages,
            availableModels
        )
    }
}
