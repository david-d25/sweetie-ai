package space.davids_digital.sweetie.model

import java.time.ZonedDateTime

data class VkUserModel(
    val id: Long,
    val firstNameCached: String,
    val lastNameCached: String,
    val credits: Long,
    val lastCreditGain: ZonedDateTime,
    val usagePlanId: String,
    val usagePlanExpiry: ZonedDateTime?
)
