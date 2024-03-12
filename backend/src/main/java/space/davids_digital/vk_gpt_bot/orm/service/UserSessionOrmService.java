package space.davids_digital.vk_gpt_bot.orm.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import space.davids_digital.vk_gpt_bot.model.UserSessionModel;
import space.davids_digital.vk_gpt_bot.orm.entity.UserSessionEntity;
import space.davids_digital.vk_gpt_bot.orm.repository.UserSessionRepository;
import space.davids_digital.vk_gpt_bot.rest.exception.InvalidSessionStateException;
import space.davids_digital.vk_gpt_bot.service.CryptographyService;

import javax.crypto.BadPaddingException;
import javax.crypto.IllegalBlockSizeException;
import java.nio.charset.StandardCharsets;
import java.time.ZonedDateTime;
import java.util.Collection;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class UserSessionOrmService {
    private final UserSessionRepository userSessionRepository;
    private final CryptographyService cryptographyService;

    public UserSessionOrmService(
            UserSessionRepository userSessionRepository,
            CryptographyService cryptographyService
    ) {
        this.userSessionRepository = userSessionRepository;
        this.cryptographyService = cryptographyService;
    }

    public void deleteUserSession(UUID sessionId) {
        userSessionRepository.deleteById(sessionId);
    }

    public UserSessionModel createUserSession(
            long vkUserId,
            String sessionToken,
            String vkAccessToken,
            String vkAccessTokenId,
            ZonedDateTime validUntil
    ) {
        var entity = new UserSessionEntity();
        entity.userVkId = vkUserId;
        try {
            entity.sessionTokenEncrypted = cryptographyService.encrypt(sessionToken.getBytes(StandardCharsets.UTF_8));
            entity.vkAccessTokenEncrypted = cryptographyService.encrypt(vkAccessToken.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new RuntimeException("Encryption error", e);
        }
        entity.vkAccessTokenId = vkAccessTokenId;
        entity.validUntil = validUntil;
        return mapEntityToModel(userSessionRepository.save(entity));
    }

    public Collection<UserSessionModel> getUnexpiredUserSessionsByVkId(long vkUserId) {
        return userSessionRepository.findAllByUserVkIdAndValidUntilAfter(vkUserId, ZonedDateTime.now()).stream()
                .map(this::mapEntityToModel)
                .collect(Collectors.toList());
    }

    @Scheduled(fixedDelay = 5, timeUnit = TimeUnit.MINUTES)
    public void cleanUpOldTokens() {
        userSessionRepository.deleteByValidUntilBefore(ZonedDateTime.now());
    }

    private UserSessionModel mapEntityToModel(UserSessionEntity entity) {
        try {
            return new UserSessionModel(
                    entity.id,
                    entity.userVkId,
                    new String(cryptographyService.decrypt(entity.sessionTokenEncrypted), StandardCharsets.UTF_8),
                    new String(cryptographyService.decrypt(entity.vkAccessTokenEncrypted), StandardCharsets.UTF_8),
                    entity.vkAccessTokenId,
                    entity.validUntil
            );
        } catch (IllegalBlockSizeException | BadPaddingException e) {
            throw new InvalidSessionStateException("Couldn't decrypt access tokens");
        } catch (Exception e) {
            throw new RuntimeException("Decryption error", e);
        }
    }
}
