package space.davids_digital.sweetie.integration.vk

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service
import space.davids_digital.sweetie.model.UserSessionModel
import space.davids_digital.sweetie.orm.service.UserSessionOrmService
import space.davids_digital.sweetie.service.SessionService
import java.time.ZonedDateTime
import java.util.*

@Service
class VkAuthService @Autowired constructor(
    private val vkRestApiService: VkRestApiService,
    private val userSessionOrmService: UserSessionOrmService,
    private val sessionService: SessionService
) {
    companion object {
        private val log = LoggerFactory.getLogger(VkAuthService::class.java)
    }

    fun createSessionFromSilentToken(silentToken: String, uuid: UUID): UserSessionModel {
        log.info("Creating session from silent token")
        val result = vkRestApiService.exchangeSilentTokenToAccessToken(silentToken, uuid)
        val sessionToken = sessionService.createNewSessionToken()
        return userSessionOrmService.createUserSession(
            result.userId,
            sessionToken,
            result.accessToken!!,
            result.accessTokenId!!,
            ZonedDateTime.now().plusSeconds(result.expiresIn)
        )
    }
}
