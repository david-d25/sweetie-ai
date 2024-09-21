package space.davids_digital.sweetie.integration.vk;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import space.davids_digital.sweetie.model.UserSessionModel;
import space.davids_digital.sweetie.orm.service.UserSessionOrmService;
import space.davids_digital.sweetie.service.SessionService;

import java.time.ZonedDateTime;
import java.util.UUID;

@Service
public class VkAuthService {
    private static final Logger log = LoggerFactory.getLogger(VkAuthService.class);

    private final VkRestApiService vkRestApiService;
    private final UserSessionOrmService userSessionOrmService;
    private final SessionService sessionService;

    @Autowired
    public VkAuthService(
            VkRestApiService vkRestApiService,
            UserSessionOrmService userSessionOrmService,
            SessionService sessionService
    ) {
        this.vkRestApiService = vkRestApiService;
        this.userSessionOrmService = userSessionOrmService;
        this.sessionService = sessionService;
    }

    public UserSessionModel createSessionFromSilentToken(String silentToken, UUID uuid) {
        log.info("Creating session from silent token");
        var result = vkRestApiService.exchangeSilentTokenToAccessToken(silentToken, uuid);
        var sessionToken = sessionService.createNewSessionToken();
        return userSessionOrmService.createUserSession(
                result.userId,
                sessionToken,
                result.accessToken,
                result.accessTokenId,
                ZonedDateTime.now().plusSeconds(result.expiresIn)
        );
    }
}
