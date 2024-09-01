package space.davids_digital.sweetie.rest.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import space.davids_digital.sweetie.integration.vk.VkRestApiService;
import space.davids_digital.sweetie.integration.vk.dto.VkConversationDto;
import space.davids_digital.sweetie.model.ChatSettingsModel;
import space.davids_digital.sweetie.orm.service.ChatSettingsOrmService;
import space.davids_digital.sweetie.rest.dto.ChatDto;
import space.davids_digital.sweetie.rest.dto.ChatSettingsUpdateDto;
import space.davids_digital.sweetie.rest.exception.ResourceNotFoundException;
import space.davids_digital.sweetie.service.ChatService;
import space.davids_digital.sweetie.service.OpenAiService;
import space.davids_digital.sweetie.service.SessionService;

import java.util.List;

@RestController
@RequestMapping("/chat")
public class ChatController {

    private final ChatService chatService;
    private final VkRestApiService vkRestApiService;
    private final OpenAiService openAiService;
    private final SessionService sessionService;
    private final ChatSettingsOrmService chatSettingsOrmService;

    @Autowired
    public ChatController(
            ChatService chatService,
            VkRestApiService vkRestApiService,
            OpenAiService openAiService,
            SessionService sessionService,
            ChatSettingsOrmService chatSettingsOrmService
    ) {
        this.chatService = chatService;
        this.vkRestApiService = vkRestApiService;
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

        var vkChat = vkRestApiService.getConversations(chatSettings.peerId()).stream().findFirst().orElse(null);
        return createChatDto(chatSettings, vkChat, openAiService.getAvailableGptModels());
    }

    @PostMapping("/{id}")
    @ResponseBody
    public ChatDto updateChatSettings(@PathVariable("id") long id, @RequestBody ChatSettingsUpdateDto dto) {
        var session = sessionService.requireSession();
        var chatSettings = chatSettingsOrmService.findByIdAndHavingAdmin(id, session.userVkId());
        var vkChat = vkRestApiService.getConversations(chatSettings.peerId()).stream().findFirst().orElse(null);
        return createChatDto(chatService.update(id, dto), vkChat, openAiService.getAvailableGptModels());
    }

    private ChatDto createChatDto(
            ChatSettingsModel chatSettings,
            VkConversationDto vkChat,
            List<String> availableModels
    ) {
        return new ChatDto(
                chatSettings.peerId(),
                vkChat != null ? vkChat.chatSettings.title : null,
                vkChat != null ? vkChat.chatSettings.photo.photo200 : null,
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
