package space.davids_digital.vk_gpt_bot.rest.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import space.davids_digital.vk_gpt_bot.integration.vk.VkApiService;
import space.davids_digital.vk_gpt_bot.integration.vk.dto.VkConversationDto;
import space.davids_digital.vk_gpt_bot.model.ChatSettingsModel;
import space.davids_digital.vk_gpt_bot.orm.service.ChatSettingsOrmService;
import space.davids_digital.vk_gpt_bot.rest.dto.ChatDto;
import space.davids_digital.vk_gpt_bot.rest.dto.ChatSettingsUpdateDto;
import space.davids_digital.vk_gpt_bot.rest.exception.ResourceNotFoundException;
import space.davids_digital.vk_gpt_bot.service.ChatService;
import space.davids_digital.vk_gpt_bot.service.OpenAiService;
import space.davids_digital.vk_gpt_bot.service.SessionService;

import java.util.List;

@RestController
@RequestMapping("/chat")
public class ChatController {

    private final ChatService chatService;
    private final VkApiService vkApiService;
    private final OpenAiService openAiService;
    private final SessionService sessionService;
    private final ChatSettingsOrmService chatSettingsOrmService;

    @Autowired
    public ChatController(
            ChatService chatService,
            VkApiService vkApiService,
            OpenAiService openAiService,
            SessionService sessionService,
            ChatSettingsOrmService chatSettingsOrmService
    ) {
        this.chatService = chatService;
        this.vkApiService = vkApiService;
        this.openAiService = openAiService;
        this.sessionService = sessionService;
        this.chatSettingsOrmService = chatSettingsOrmService;
    }

    @GetMapping("/{id}")
    @ResponseBody
    public ChatDto getChat(@PathVariable("id") long id) {
        var session = sessionService.requireSession();
        var chatSettings = chatSettingsOrmService.findByIdAndHavingAdmin(id, session.userVkId());
        if (chatSettings == null) {
            throw new ResourceNotFoundException();
        }

        var vkChat = vkApiService.getConversations(chatSettings.peerId()).stream().findFirst().orElse(null);
        return createChatDto(chatSettings, vkChat, openAiService.getAvailableGptModels());
    }

    @PostMapping("/{id}")
    @ResponseBody
    public ChatDto updateChatSettings(@PathVariable("id") long id, @RequestBody ChatSettingsUpdateDto dto) {
        var session = sessionService.requireSession();
        var chatSettings = chatSettingsOrmService.findByIdAndHavingAdmin(id, session.userVkId());
        var vkChat = vkApiService.getConversations(chatSettings.peerId()).stream().findFirst().orElse(null);
        return createChatDto(chatService.update(id, dto), vkChat, openAiService.getAvailableGptModels());
    }

    private ChatDto createChatDto(
            ChatSettingsModel chatSettings,
            VkConversationDto vkChat,
            List<String> availableModels
    ) {
        var pictureUrl = vkChat != null ? vkChat.chatSettings != null ? vkChat.chatSettings.photo != null ? vkChat.chatSettings.photo.photo200 : null : null : null;
        var title = vkChat != null ? vkChat.chatSettings != null ? vkChat.chatSettings.title : null : null;
        return new ChatDto(
                chatSettings.peerId(),
                title,
                pictureUrl,
                chatSettings.botEnabled(),
                chatSettings.context(),
                chatSettings.gptMaxInputTokens(),
                chatSettings.gptMaxOutputTokens(),
                chatSettings.gptTemperature(),
                chatSettings.gptTopP(),
                chatSettings.gptFrequencyPenalty(),
                chatSettings.gptPresencePenalty(),
                chatSettings.gptModel(),
                chatSettings.processAudioMessages(),
                availableModels
        );
    }
}
