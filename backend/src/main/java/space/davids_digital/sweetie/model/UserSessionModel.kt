package space.davids_digital.sweetie.model

import java.time.ZonedDateTime
import java.util.*

data class UserSessionModel(
    val id: UUID,
    val userVkId: Long,
    val sessionToken: String,
    val vkAccessToken: String,
    val vkAccessTokenId: String,
    val validUntil: ZonedDateTime
) {
    init {
        require(userVkId >= 0) { "userVkId is negative" }
    }
}
