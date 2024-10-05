package space.davids_digital.sweetie.service

import jakarta.transaction.Transactional
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import space.davids_digital.sweetie.model.UsagePlanModel
import space.davids_digital.sweetie.orm.repository.VkUserRepository
import space.davids_digital.sweetie.orm.service.UsagePlanOrmService
import space.davids_digital.sweetie.orm.service.VkUserOrmService
import java.time.ZonedDateTime
import kotlin.math.ceil
import kotlin.math.floor

@Service
class UsagePlanService(
    private val usagePlanOrmService: UsagePlanOrmService,
    private val vkUserRepository: VkUserRepository,
    private val vkUserOrmService: VkUserOrmService
) {
    companion object {
        private val log = LoggerFactory.getLogger(UsagePlanService::class.java)
        private const val DEFAULT_PLAN_ID = "default"
        private const val ROUTINE_DELAY = 15_000L
    }

    fun getDefault(): UsagePlanModel {
        val plan = usagePlanOrmService.getById(DEFAULT_PLAN_ID)
        if (plan == null) {
            log.warn("Default usage plan with id = '$DEFAULT_PLAN_ID' not found, falling back to internal default")
            return UsagePlanModel(
                id = DEFAULT_PLAN_ID,
                title = "Default",
                maxCredits = 0,
                creditGainAmount = 0,
                creditGainPeriodSeconds = 0,
                visible = false
            )
        }
        return plan
    }

    fun getOrDefault(planId: String?): UsagePlanModel {
        return usagePlanOrmService.getById(planId ?: DEFAULT_PLAN_ID) ?: getDefault()
    }

    @Scheduled(fixedDelay = ROUTINE_DELAY)
    fun checkPlansExpirationRoutine() {
        log.debug("Checking usage plans expiration")
        val expiredPlans = vkUserRepository.setUsagePlanWhereExpiryBefore(null, ZonedDateTime.now())
        if (expiredPlans > 0) {
            log.info("Removed $expiredPlans expired plans")
        }
    }

    @Transactional
    @Scheduled(fixedDelay = ROUTINE_DELAY)
    fun gainCreditsRoutine() {
        log.debug("Updating user credits")
        val now = ZonedDateTime.now()
        val users = vkUserOrmService.findAllByCreditsLessThanMax()
        val plans = usagePlanOrmService.findAll().associateBy { it.id }
        users.forEach { user ->
            val plan = plans[user.usagePlanId ?: DEFAULT_PLAN_ID] ?: return@forEach
            if (user.credits > plan.maxCredits || plan.creditGainPeriodSeconds <= 0) {
                return@forEach
            }
            val lastCreditGain = user.lastCreditGain?.toEpochSecond() ?: 0
            val secondsSinceLastCreditGain = floor((now.toEpochSecond() - lastCreditGain).toDouble())
            val gainCreditTimes = floor(secondsSinceLastCreditGain / plan.creditGainPeriodSeconds.toDouble())
            val creditsToGain = (gainCreditTimes * plan.creditGainAmount).toLong()
            var newCredits = user.credits + creditsToGain
            if (newCredits > plan.maxCredits)
                newCredits = plan.maxCredits
            val newLastCreditGain = user.lastCreditGain?.plusSeconds(
                (gainCreditTimes * plan.creditGainPeriodSeconds).toLong()
            ) ?: now
            vkUserOrmService.setCredits(user.id, newCredits)
            vkUserOrmService.setLastCreditGain(user.id, newLastCreditGain)
        }
        vkUserRepository.setLastCreditGainWhereMaxCredits(now)
    }

    fun getTimeInSecondsRequiredToHaveEnoughCredits(userId: Long, creditsRequired: Long): Long {
        val user = vkUserOrmService.getById(userId)
        if (user == null) {
            log.error("User with id $userId not found")
            return Long.MAX_VALUE
        }
        if (user.credits >= creditsRequired) {
            return 0
        }
        val plan = getOrDefault(user.usagePlanId)
        if (plan.creditGainAmount <= 0 || plan.creditGainPeriodSeconds <= 0) {
            return Long.MAX_VALUE
        }
        val creditsNeeded = creditsRequired - user.credits
        val fullCyclesNeeded = ceil(creditsNeeded.toDouble() / plan.creditGainAmount)
        val secondsSinceLastCreditGain = floor(
            ZonedDateTime.now().toEpochSecond().toDouble() - (user.lastCreditGain?.toEpochSecond() ?: 0)
        )
        return ceil(fullCyclesNeeded * plan.creditGainPeriodSeconds - secondsSinceLastCreditGain).toLong()
    }
}