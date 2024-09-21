package space.davids_digital.sweetie.integration.vk.dto

import com.fasterxml.jackson.annotation.JsonProperty

@Deprecated("Use new API")
open class VkUserDto {
    @JsonProperty("id")
    var id: Long = 0

    @JsonProperty("first_name")
    var firstName: String? = null

    @JsonProperty("last_name")
    var lastName: String? = null

    @JsonProperty("is_closed")
    var isClosed = false

    @JsonProperty("can_access_closed")
    var canAccessClosed = false

    @JsonProperty("photo_200")
    var photo200: String? = null
}
