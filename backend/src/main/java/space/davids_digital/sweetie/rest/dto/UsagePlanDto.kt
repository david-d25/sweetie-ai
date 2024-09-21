package space.davids_digital.sweetie.rest.dto

data class UsagePlanDto(
    val id: String,
    val title: String,
    val maxCredits: Long,
    val creditGainAmount: Long,
    val creditGainPeriodSeconds: Long,
    val visible: Boolean
)
