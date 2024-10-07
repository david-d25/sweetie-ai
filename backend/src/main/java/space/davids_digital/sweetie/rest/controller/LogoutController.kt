package space.davids_digital.sweetie.rest.controller

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseBody
import org.springframework.web.bind.annotation.RestController
import space.davids_digital.sweetie.orm.service.UserSessionOrmService
import space.davids_digital.sweetie.rest.removeAuthCookies
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
        return ResponseEntity.ok().removeAuthCookies().build<Any>()
    }
}
