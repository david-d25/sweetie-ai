package space.davids_digital.sweetie.orm.service

import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import space.davids_digital.sweetie.model.UserSessionModel
import space.davids_digital.sweetie.orm.entity.UserSessionEntity
import space.davids_digital.sweetie.orm.repository.UserSessionRepository
import space.davids_digital.sweetie.rest.exception.InvalidSessionStateException
import space.davids_digital.sweetie.service.CryptographyService
import java.nio.charset.StandardCharsets
import java.time.ZonedDateTime
import java.util.*
import java.util.concurrent.TimeUnit
import javax.crypto.BadPaddingException
import javax.crypto.IllegalBlockSizeException

@Service
class UserSessionOrmService(
    private val userSessionRepository: UserSessionRepository,
    private val cryptographyService: CryptographyService
) {
    fun deleteUserSession(sessionId: UUID) {
        userSessionRepository.deleteById(sessionId)
    }

    fun createUserSession(
        vkUserId: Long,
        sessionToken: String,
        vkAccessToken: String,
        vkAccessTokenId: String,
        validUntil: ZonedDateTime
    ): UserSessionModel {
        val entity = UserSessionEntity()
        entity.userVkId = vkUserId
        try {
            entity.sessionTokenEncrypted = cryptographyService.encrypt(sessionToken.toByteArray(StandardCharsets.UTF_8))
            entity.vkAccessTokenEncrypted =
                cryptographyService.encrypt(vkAccessToken.toByteArray(StandardCharsets.UTF_8))
        } catch (e: Exception) {
            throw RuntimeException("Encryption error", e)
        }
        entity.vkAccessTokenId = vkAccessTokenId
        entity.validUntil = validUntil
        return toModel(userSessionRepository.save(entity))
    }

    fun getUnexpiredUserSessionsByVkId(vkUserId: Long): Collection<UserSessionModel> {
        return userSessionRepository.findAllByUserVkIdAndValidUntilAfter(vkUserId, ZonedDateTime.now())
            .map { toModel(it) }
            .toList()
    }

    @Scheduled(fixedDelay = 5, timeUnit = TimeUnit.MINUTES)
    fun cleanUpOldTokens() {
        userSessionRepository.deleteByValidUntilBefore(ZonedDateTime.now())
    }

    private fun toModel(entity: UserSessionEntity): UserSessionModel {
        return try {
            UserSessionModel(
                entity.id,
                entity.userVkId,
                String(cryptographyService.decrypt(entity.sessionTokenEncrypted), StandardCharsets.UTF_8),
                String(
                    cryptographyService.decrypt(entity.vkAccessTokenEncrypted), StandardCharsets.UTF_8
                ),
                entity.vkAccessTokenId,
                entity.validUntil
            )
        } catch (e: IllegalBlockSizeException) {
            throw InvalidSessionStateException("Couldn't decrypt access tokens")
        } catch (e: BadPaddingException) {
            throw InvalidSessionStateException("Couldn't decrypt access tokens")
        } catch (e: Exception) {
            throw RuntimeException("Decryption error", e)
        }
    }
}
