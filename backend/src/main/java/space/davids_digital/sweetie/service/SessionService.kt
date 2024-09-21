package space.davids_digital.sweetie.service

import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import space.davids_digital.sweetie.model.UserSessionModel
import space.davids_digital.sweetie.rest.auth.UserAuthentication
import java.security.SecureRandom
import java.util.*

@Service
class SessionService {
    companion object {
        private const val TOKEN_LENGTH_BYTES = 64
    }

    fun createNewSessionToken(): String {
        val random = SecureRandom()
        val bytes = ByteArray(TOKEN_LENGTH_BYTES)
        random.nextBytes(bytes)
        return Base64.getEncoder().encodeToString(bytes)
    }

    fun requireSession(): UserSessionModel {
        val authentication = SecurityContextHolder.getContext().authentication
        if (authentication is UserAuthentication) {
            return authentication.session
        }
        throw SecurityException("Session was required, but is not present")
    }
}
