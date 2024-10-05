package space.davids_digital.sweetie.integration.vk.dto

import com.fasterxml.jackson.annotation.JsonProperty

@Deprecated("Use new API")
open class VkApiResponseDto {
    @JsonProperty("error")
    var error: Error? = null

    open class Error {
        @JsonProperty("error_code")
        var errorCode = 0

        @JsonProperty("error_msg")
        var errorMsg: String? = null
    }
}
