package space.davids_digital.sweetie.rest.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import space.davids_digital.sweetie.integration.vk.VkRestApiService;
import space.davids_digital.sweetie.model.ChatSettingsModel;
import space.davids_digital.sweetie.orm.service.ChatSettingsOrmService;
import space.davids_digital.sweetie.orm.service.UsagePlanOrmService;
import space.davids_digital.sweetie.orm.service.VkUserOrmService;
import space.davids_digital.sweetie.rest.dto.DashboardDto;
import space.davids_digital.sweetie.rest.dto.UserDto;
import space.davids_digital.sweetie.rest.mapper.UsagePlanDtoMapper;
import space.davids_digital.sweetie.service.SessionService;

import java.util.stream.Collectors;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {
    private final VkRestApiService vkRestApiService;
    private final SessionService sessionService;
    private final VkUserOrmService vkUserOrmService;
    private final UsagePlanOrmService usagePlanOrmService;
    private final UsagePlanDtoMapper usagePlanDtoMapper;
    private final ChatSettingsOrmService chatSettingsOrmService;

    public DashboardController(
            VkRestApiService vkRestApiService,
            SessionService sessionService,
            VkUserOrmService vkUserOrmService,
            UsagePlanOrmService usagePlanOrmService,
            UsagePlanDtoMapper usagePlanDtoMapper,
            ChatSettingsOrmService chatSettingsOrmService
    ) {
        this.vkRestApiService = vkRestApiService;
        this.sessionService = sessionService;
        this.vkUserOrmService = vkUserOrmService;
        this.usagePlanOrmService = usagePlanOrmService;
        this.usagePlanDtoMapper = usagePlanDtoMapper;
        this.chatSettingsOrmService = chatSettingsOrmService;
    }

    @GetMapping
    public DashboardDto getDashboard() {
        var session = sessionService.requireSession();
        var userVkId = session.userVkId();
        var user = vkUserOrmService.getOrCreateDefault(userVkId);
        var usagePlan = usagePlanOrmService.getOrDefault(user.getUsagePlanId(), "default");
        var vkUser = vkRestApiService.getUser(userVkId);
        var chatSettings = chatSettingsOrmService.findHavingAdmin(userVkId);
        var vkChats = vkRestApiService.getConversations(
                chatSettings.stream().mapToLong(ChatSettingsModel::getPeerId).toArray()
        );
        var peerIdToChat = vkChats.stream().collect(Collectors.toMap(v -> v.peer.id, v -> v));
        var chats = chatSettings.stream().map(c -> {
            var photo = peerIdToChat.containsKey(c.getPeerId())
                    ? peerIdToChat.get(c.getPeerId()).chatSettings != null ? peerIdToChat.get(c.getPeerId()).chatSettings.photo != null ? peerIdToChat.get(c.getPeerId()).chatSettings.photo.photo200 : null : null : null;
            var title = peerIdToChat.containsKey(c.getPeerId())
                    ? peerIdToChat.get(c.getPeerId()).chatSettings != null ? peerIdToChat.get(c.getPeerId()).chatSettings.title : null : null;
            return new DashboardDto.Chat(c.getPeerId(), title, photo, c.getBotEnabled()
            );
        }).toList();
        var userDto = new UserDto(
                userVkId,
                vkUser.firstName,
                vkUser.lastName,
                user.getCredits(),
                vkUser.photo200,
                user.getLastCreditGain(),
                usagePlanDtoMapper.modelToDto(usagePlan),
                user.getUsagePlanExpiry()
        );

        return new DashboardDto(userDto, chats);
    }
}
