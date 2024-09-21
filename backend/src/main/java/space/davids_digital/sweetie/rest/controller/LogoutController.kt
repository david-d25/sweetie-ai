package space.davids_digital.sweetie.rest.controller

import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseCookie
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseBody
import org.springframework.web.bind.annotation.RestController
import space.davids_digital.sweetie.orm.service.UserSessionOrmService
import space.davids_digital.sweetie.rest.CookieName.AUTH_TOKEN
import space.davids_digital.sweetie.rest.CookieName.USER_VK_ID
import space.davids_digital.sweetie.service.SessionService

@RestController
@RequestMapping("/logout")
class LogoutController(
    private val userSessionOrmService: UserSessionOrmService,
    private val sessionService: SessionService
) {
    @PostMapping
    @ResponseBody
    fun logout(): ResponseEntity<*> {
        try {
            userSessionOrmService.deleteUserSession(sessionService.requireSession().id)
        } catch (ignored: SecurityException) {}
        val sessionTokenCookie = ResponseCookie.from(AUTH_TOKEN, "")
            .maxAge(0)
            .httpOnly(true)
            .secure(true)
            .path("/")
            .sameSite("Strict")
            .build()
        val userVkIdCookie = ResponseCookie.from(USER_VK_ID, "")
            .maxAge(0)
            .secure(true)
            .path("/")
            .sameSite("Strict")
            .build()
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, sessionTokenCookie.toString())
            .header(HttpHeaders.SET_COOKIE, userVkIdCookie.toString())
            .build<Any>()
    }
}
