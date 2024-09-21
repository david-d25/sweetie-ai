package space.davids_digital.sweetie.rest.dto;

import java.util.List;

public record DashboardDto(
        UserDto user,
        List<Chat> chats
) {
    public record Chat(
            long peerId,
            String title,
            String pictureUrl,
            boolean botEnabled
    ) {}
}