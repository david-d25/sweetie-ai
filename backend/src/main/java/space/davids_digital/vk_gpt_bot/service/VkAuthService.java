package space.davids_digital.vk_gpt_bot.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import space.davids_digital.vk_gpt_bot.integration.vk.VkApiService;
import space.davids_digital.vk_gpt_bot.model.UserSessionModel;
import space.davids_digital.vk_gpt_bot.orm.service.UserSessionOrmService;
import space.davids_digital.vk_gpt_bot.integration.vk.dto.VkSilentTokenExchangeResultDto;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.UUID;

@Service
public class VkAuthService {
    private static final Logger log = LoggerFactory.getLogger(VkAuthService.class);

    private final VkApiService vkApiService;
    private final UserSessionOrmService userSessionOrmService;
    private final SessionService sessionService;

    @Autowired
    public VkAuthService(
            VkApiService vkApiService,
            UserSessionOrmService userSessionOrmService,
            SessionService sessionService
    ) {
        this.vkApiService = vkApiService;
        this.userSessionOrmService = userSessionOrmService;
        this.sessionService = sessionService;
    }

    public UserSessionModel createSessionFromSilentToken(String silentToken, UUID uuid) {
        log.info("Creating session from silent token");
        var result = vkApiService.exchangeSilentTokenToAccessToken(silentToken, uuid);
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
