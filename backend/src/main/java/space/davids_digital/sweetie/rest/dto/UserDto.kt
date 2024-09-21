package space.davids_digital.sweetie.rest.dto

import java.time.ZonedDateTime

data class UserDto(
    val vkId: Long,
    val firstName: String?,
    val lastName: String?,
    val credits: Long,
    val photoUrl: String?,
    val lastCreditGain: ZonedDateTime?,
    val usagePlan: UsagePlanDto,
    val usagePlanExpiry: ZonedDateTime?
)
