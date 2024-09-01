package space.davids_digital.sweetie.model;

import java.time.ZonedDateTime;
import java.util.UUID;

public record UserSessionModel(
        UUID id,
        long userVkId,
        String sessionToken,
        String vkAccessToken,
        String vkAccessTokenId,
        ZonedDateTime validUntil
) {
    public UserSessionModel {
        if (id == null) {
            throw new IllegalArgumentException("vkId is null");
        }
        if (userVkId < 0) {
            throw new IllegalArgumentException("userVkId is negative");
        }
        if (sessionToken == null) {
            throw new IllegalArgumentException("sessionToken is null");
        }
        if (vkAccessToken == null) {
            throw new IllegalArgumentException("vkAccessToken is null");
        }
        if (vkAccessTokenId == null) {
            throw new IllegalArgumentException("vkAccessTokenId is null");
        }
        if (validUntil == null) {
            throw new IllegalArgumentException("validUntil is null");
        }
    }
}
