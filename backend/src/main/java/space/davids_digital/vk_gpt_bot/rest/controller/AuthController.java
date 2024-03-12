package space.davids_digital.vk_gpt_bot.rest.controller;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import space.davids_digital.vk_gpt_bot.service.VkAuthService;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.ZonedDateTime;
import java.util.UUID;

import static space.davids_digital.vk_gpt_bot.rest.CookieName.AUTH_TOKEN;
import static space.davids_digital.vk_gpt_bot.rest.CookieName.USER_VK_ID;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final VkAuthService vkAuthService;
    private final String frontendUrlBase;
    private final String cookiesDomain;

    public AuthController(
            VkAuthService vkAuthService,
            @Qualifier("frontendUrlBase") String frontendUrlBase,
            @Qualifier("cookiesDomain") String cookiesDomain
    ) {
        this.vkAuthService = vkAuthService;
        this.frontendUrlBase = frontendUrlBase;
        this.cookiesDomain = cookiesDomain;
    }

    @GetMapping("vk-id")
    @ResponseBody
    public ResponseEntity<?> authVkId(
            @RequestParam("payload") String payload,
            @RequestParam("state") String state
    ) {
        try {
            var mapper = new JsonMapper();
            mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
            var decodedPayload = URLDecoder.decode(payload, StandardCharsets.UTF_8);
            var dto = mapper.readValue(decodedPayload, VkAuthRedirectPayloadDto.class);
            var userSession = vkAuthService.createSessionFromSilentToken(dto.token, dto.uuid);
            var sessionToken = userSession.sessionToken();
            var userVkId = userSession.userVkId();
            var url = URI.create(frontendUrlBase + "/").resolve("login");

            var maxAge = userSession.validUntil().minusSeconds(ZonedDateTime.now().toEpochSecond()).toEpochSecond();
            var sessionTokenCookie = ResponseCookie.from(AUTH_TOKEN, sessionToken)
                    .httpOnly(true)
                    .secure(true)
                    .sameSite("Strict")
                    .domain(cookiesDomain)
                    .maxAge(maxAge)
                    .path("/")
                    .build();
            var userVkIdCookie = ResponseCookie.from(USER_VK_ID, Long.toString(userVkId))
                    .secure(true)
                    .sameSite("Strict")
                    .domain(cookiesDomain)
                    .maxAge(maxAge)
                    .path("/")
                    .build();

            return ResponseEntity.status(HttpStatus.TEMPORARY_REDIRECT)
                    .location(url)
                    .header(HttpHeaders.SET_COOKIE, sessionTokenCookie.toString())
                    .header(HttpHeaders.SET_COOKIE, userVkIdCookie.toString())
                    .build();
        } catch (Exception e) {
            log.error("Failed to authenticate", e);
            var url = URI.create(frontendUrlBase + "/").resolve("login?status=error");
            return ResponseEntity.status(HttpStatus.TEMPORARY_REDIRECT).location(url).build();
        }
    }

    private static class VkAuthRedirectPayloadDto {
        public String token;
        public UUID uuid;
    }
}
