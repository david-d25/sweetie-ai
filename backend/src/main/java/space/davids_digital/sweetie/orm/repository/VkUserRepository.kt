package space.davids_digital.sweetie.orm.repository

import jakarta.transaction.Transactional
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.CrudRepository
import space.davids_digital.sweetie.orm.entity.VkUserEntity
import java.time.ZonedDateTime

interface VkUserRepository: JpaRepository<VkUserEntity, Long> {
    @Query("select u from VkUserEntity u left join UsagePlanEntity p on coalesce(u.usagePlanId, 'default') = p.id where u.credits < p.maxCredits")
    fun findAllByCreditsLessThanMax(): List<VkUserEntity>

    @Modifying
    @Transactional
    @Query("update VkUserEntity u set u.lastCreditGain = ?1 where u.credits >= (select coalesce(p.maxCredits, 0) from UsagePlanEntity p where p.id = coalesce(u.usagePlanId, 'default'))")
    fun setLastCreditGainWhereMaxCredits(lastCreditGain: ZonedDateTime)

    @Modifying
    @Transactional
    @Query("update VkUserEntity u set u.credits = u.credits + ?2 where u.id = ?1")
    fun addCredits(id: Long, credits: Int)

    @Modifying
    @Transactional
    @Query("update VkUserEntity u set u.usagePlanId = ?2, u.usagePlanExpiry = ?3 where u.id = ?1")
    fun setUsagePlan(id: Long, planId: String, expiry: ZonedDateTime?)

    @Modifying
    @Transactional
    @Query("update VkUserEntity u set u.usagePlanId = ?1, u.usagePlanExpiry = null where u.usagePlanExpiry < ?2")
    fun setUsagePlanWhereExpiryBefore(planId: String?, dateTime: ZonedDateTime): Int
}