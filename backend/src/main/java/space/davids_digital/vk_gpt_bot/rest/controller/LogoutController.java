package space.davids_digital.vk_gpt_bot.rest.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import space.davids_digital.vk_gpt_bot.orm.service.UserSessionOrmService;
import space.davids_digital.vk_gpt_bot.service.SessionService;

import static space.davids_digital.vk_gpt_bot.rest.CookieName.AUTH_TOKEN;
import static space.davids_digital.vk_gpt_bot.rest.CookieName.USER_VK_ID;

@RestController
@RequestMapping("/logout")
public class LogoutController {
    private final UserSessionOrmService userSessionOrmService;
    private final SessionService sessionService;

    public LogoutController(UserSessionOrmService userSessionOrmService, SessionService sessionService) {
        this.userSessionOrmService = userSessionOrmService;
        this.sessionService = sessionService;
    }

    @PostMapping
    @ResponseBody
    public ResponseEntity<?> logout() {
        try {
            userSessionOrmService.deleteUserSession(sessionService.requireSession().id());
        } catch (SecurityException ignored) {}
        var sessionTokenCookie = ResponseCookie.from(AUTH_TOKEN, "")
                .maxAge(0)
                .httpOnly(true)
                .secure(true)
                .path("/")
                .sameSite("Strict")
                .build();
        var userVkIdCookie = ResponseCookie.from(USER_VK_ID, "")
                .maxAge(0)
                .secure(true)
                .path("/")
                .sameSite("Strict")
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, sessionTokenCookie.toString())
                .header(HttpHeaders.SET_COOKIE, userVkIdCookie.toString())
                .build();
    }
}
