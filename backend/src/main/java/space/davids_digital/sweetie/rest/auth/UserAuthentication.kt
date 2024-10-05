package space.davids_digital.sweetie.rest.auth

import org.springframework.security.core.Authentication
import org.springframework.security.core.GrantedAuthority
import space.davids_digital.sweetie.model.UserSessionModel

class UserAuthentication(val session: UserSessionModel): Authentication {
    private var authenticated = true

    override fun getAuthorities(): Collection<GrantedAuthority?>? {
        return null
    }

    override fun getCredentials(): Any? {
        return null
    }

    override fun getDetails(): Any? {
        return null
    }

    override fun getPrincipal(): Long {
        return session.userVkId
    }

    override fun isAuthenticated(): Boolean {
        return authenticated
    }

    @Throws(IllegalArgumentException::class)
    override fun setAuthenticated(isAuthenticated: Boolean) {
        authenticated = isAuthenticated
    }

    override fun getName(): String? {
        return null
    }
}
