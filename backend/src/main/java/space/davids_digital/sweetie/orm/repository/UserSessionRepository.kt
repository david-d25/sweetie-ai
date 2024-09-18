package space.davids_digital.sweetie.orm.repository

import org.springframework.data.repository.CrudRepository
import org.springframework.stereotype.Repository
import space.davids_digital.sweetie.orm.entity.UserSessionEntity
import java.time.ZonedDateTime
import java.util.*

@Repository
interface UserSessionRepository: CrudRepository<UserSessionEntity, UUID> {
    fun findAllByValidUntilBefore(validUntil: ZonedDateTime): Collection<UserSessionEntity>
    fun findAllByUserVkIdAndValidUntilAfter(userVkId: Long, validUntil: ZonedDateTime): Collection<UserSessionEntity>
    fun deleteByValidUntilBefore(validUntil: ZonedDateTime)
}
