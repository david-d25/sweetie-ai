package space.davids_digital.sweetie.orm.repository

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import space.davids_digital.sweetie.orm.entity.DeferredVkMessageEntity
import java.time.Instant

@Repository
interface DeferredVkMessageRepository: JpaRepository<DeferredVkMessageEntity, Int> {
    fun findAllBySendAtLessThanEqual(sendAt: Instant): List<DeferredVkMessageEntity>
}