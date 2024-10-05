package space.davids_digital.sweetie.model

data class UsagePlanModel(
    val id: String,
    val title: String,
    val maxCredits: Long,
    val creditGainAmount: Long,
    val creditGainPeriodSeconds: Long,
    val visible: Boolean
)
