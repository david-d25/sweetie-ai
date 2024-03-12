package space.davids_digital.vk_gpt_bot.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;
import space.davids_digital.vk_gpt_bot.model.UserSessionModel;
import space.davids_digital.vk_gpt_bot.orm.service.UserSessionOrmService;
import space.davids_digital.vk_gpt_bot.integration.vk.dto.VkSilentTokenExchangeResultDto;

import java.time.ZonedDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class VkAuthServiceTest {
    @Test
    void createSessionFromSilentTokenTest() {
        UUID uuid = UUID.randomUUID();
        String silentToken = "silentToken";
        VkSilentTokenExchangeResultDto responseDto = new VkSilentTokenExchangeResultDto();
        responseDto.userId = 123;
        responseDto.accessToken = "accessToken";
        responseDto.accessTokenId = "accessTokenId";
        String sessionToken = "sessionToken";

        RestTemplate restTemplate = mock(RestTemplate.class);
        SessionService sessionService = mock(SessionService.class);
        UserSessionOrmService userSessionOrmService = mock(UserSessionOrmService.class);

        VkAuthService vkAuthService = new VkAuthService(
                "vkAppServiceToken",
                restTemplate,
                userSessionOrmService,
                sessionService,
                300
        );

        when(restTemplate.exchange(
                any(String.class),
                any(),
                any(),
                eq(VkSilentTokenExchangeResultDto.class)
        )).thenReturn(new ResponseEntity<>(responseDto, HttpStatus.OK));

        when(sessionService.createNewSessionToken()).thenReturn(sessionToken);

        UserSessionModel expectedSession = new UserSessionModel(
                UUID.fromString("00000000-0000-0000-0000-000000000000"),
                responseDto.userId,
                sessionToken,
                responseDto.accessToken,
                responseDto.accessTokenId,
                ZonedDateTime.now().plusSeconds(300)
        );
        when(userSessionOrmService.createUserSession(
                any(Long.class),
                eq(sessionToken),
                any(),
                any(),
                any()
        )).thenReturn(expectedSession);

        UserSessionModel actualSession = vkAuthService.createSessionFromSilentToken(silentToken, uuid);

        assertEquals(expectedSession, actualSession);
    }
}
