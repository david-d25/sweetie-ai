package space.davids_digital.vk_gpt_bot.rest.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import space.davids_digital.vk_gpt_bot.integration.vk.VkApiService;
import space.davids_digital.vk_gpt_bot.model.ChatSettingsModel;
import space.davids_digital.vk_gpt_bot.orm.service.ChatSettingsOrmService;
import space.davids_digital.vk_gpt_bot.orm.service.UsagePlanOrmService;
import space.davids_digital.vk_gpt_bot.orm.service.UserOrmService;
import space.davids_digital.vk_gpt_bot.rest.dto.DashboardDto;
import space.davids_digital.vk_gpt_bot.rest.dto.UserDto;
import space.davids_digital.vk_gpt_bot.rest.mapper.UsagePlanDtoMapper;
import space.davids_digital.vk_gpt_bot.service.SessionService;

import java.util.stream.Collectors;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {
    private final VkApiService vkApiService;
    private final SessionService sessionService;
    private final UserOrmService userOrmService;
    private final UsagePlanOrmService usagePlanOrmService;
    private final UsagePlanDtoMapper usagePlanDtoMapper;
    private final ChatSettingsOrmService chatSettingsOrmService;

    public DashboardController(
            VkApiService vkApiService,
            SessionService sessionService,
            UserOrmService userOrmService,
            UsagePlanOrmService usagePlanOrmService,
            UsagePlanDtoMapper usagePlanDtoMapper,
            ChatSettingsOrmService chatSettingsOrmService
    ) {
        this.vkApiService = vkApiService;
        this.sessionService = sessionService;
        this.userOrmService = userOrmService;
        this.usagePlanOrmService = usagePlanOrmService;
        this.usagePlanDtoMapper = usagePlanDtoMapper;
        this.chatSettingsOrmService = chatSettingsOrmService;
    }

    @GetMapping
    public DashboardDto getDashboard() {
        var session = sessionService.requireSession();
        var userVkId = session.userVkId();
        var user = userOrmService.getOrCreateDefault(userVkId);
        var usagePlan = usagePlanOrmService.getOrDefault(user.usagePlanId(), "default");
        var vkUser = vkApiService.getUser(userVkId);
        var chatSettings = chatSettingsOrmService.findHavingAdmin(userVkId);
        var vkChats = vkApiService.getConversations(
                chatSettings.stream().mapToLong(ChatSettingsModel::peerId).toArray()
        );
        var peerIdToChat = vkChats.stream().collect(Collectors.toMap(v -> v.peer.id, v -> v));
        var chats = chatSettings.stream().map(c -> {
            var photo = peerIdToChat.containsKey(c.peerId())
                    ? peerIdToChat.get(c.peerId()).chatSettings.photo.photo200
                    : null;
            var title = peerIdToChat.containsKey(c.peerId())
                    ? peerIdToChat.get(c.peerId()).chatSettings.title
                    : null;
            return new DashboardDto.Chat(c.peerId(), title, photo, c.botEnabled()
            );
        }).toList();
        var userDto = new UserDto(
                userVkId,
                vkUser.firstName,
                vkUser.lastName,
                user.credits(),
                vkUser.photo200,
                user.lastCreditGain(),
                usagePlanDtoMapper.modelToDto(usagePlan),
                user.usagePlanExpiry()
        );

        return new DashboardDto(userDto, chats);
    }
}
