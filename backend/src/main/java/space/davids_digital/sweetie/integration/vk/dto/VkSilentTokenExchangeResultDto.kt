package space.davids_digital.sweetie.integration.vk.dto

import com.fasterxml.jackson.annotation.JsonProperty

@Deprecated("Use new API")
open class VkSilentTokenExchangeResultDto {
    @JsonProperty("access_token")
    var accessToken: String? = null

    @JsonProperty("access_token_id")
    var accessTokenId: String? = null

    @JsonProperty("user_id")
    var userId: Long = 0

    @JsonProperty("additional_signup_required")
    var additionalSignupRequired = false

    @JsonProperty("is_partial")
    var isPartial = false

    @JsonProperty("is_service")
    var isService = false

    @JsonProperty("source")
    var source: Long = 0

    @JsonProperty("source_description")
    var sourceDescription: String? = null

    @JsonProperty("expires_in")
    var expiresIn: Long = 0
}
