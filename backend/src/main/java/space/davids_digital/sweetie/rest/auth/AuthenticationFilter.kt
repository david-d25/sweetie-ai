package space.davids_digital.sweetie.rest.auth

import jakarta.servlet.FilterChain
import jakarta.servlet.ServletException
import jakarta.servlet.ServletRequest
import jakarta.servlet.ServletResponse
import jakarta.servlet.http.HttpServletRequest
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.filter.GenericFilterBean
import space.davids_digital.sweetie.model.UserSessionModel
import space.davids_digital.sweetie.orm.service.UserSessionOrmService
import space.davids_digital.sweetie.rest.CookieName
import java.io.IOException

class AuthenticationFilter(private val userSessionOrmService: UserSessionOrmService): GenericFilterBean() {
    @Throws(IOException::class, ServletException::class)
    override fun doFilter(
        request: ServletRequest,
        response: ServletResponse,
        filterChain: FilterChain
    ) {
        val httpRequest = request as HttpServletRequest
        val userVkId = getCookie(httpRequest, CookieName.USER_VK_ID)?.toLongOrNull()
        val sessionToken = getCookie(httpRequest, CookieName.AUTH_TOKEN)
        if (userVkId != null && sessionToken != null) {
            val session = getValidatedSession(userVkId, sessionToken)
            if (session != null) {
                SecurityContextHolder.getContext().authentication = UserAuthentication(session)
            }
        }
        filterChain.doFilter(request, response)
    }

    private fun getCookie(request: HttpServletRequest, name: String): String? {
        val cookies = request.cookies ?: return null
        for (cookie in cookies) {
            if (cookie.name == name) {
                return cookie.value
            }
        }
        return null
    }

    private fun getValidatedSession(userVkId: Long, sessionToken: String): UserSessionModel? {
        val sessions = userSessionOrmService.getUnexpiredUserSessionsByVkId(userVkId)
        return sessions.firstOrNull { it.sessionToken == sessionToken }
    }
}
