package space.davids_digital.sweetie.orm.repository

import jakarta.transaction.Transactional
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.CrudRepository
import space.davids_digital.sweetie.orm.entity.VkUserEntity
import java.time.ZonedDateTime

interface VkUserRepository: CrudRepository<VkUserEntity, Long> {
    @Modifying
    @Transactional
    @Query("update VkUserEntity u set u.credits = u.credits + ?2 where u.id = ?1")
    fun addCredits(id: Long, credits: Int)

    @Modifying
    @Transactional
    @Query("update VkUserEntity u set u.usagePlanId = ?2, u.usagePlanExpiry = ?3 where u.id = ?1")
    fun setUserUsagePlan(id: Long, planId: String, expiry: ZonedDateTime?)
}