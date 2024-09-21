package space.davids_digital.sweetie.integration.vk.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class VkSilentTokenExchangeResultDto {
    @JsonProperty("access_token")
    public String accessToken;

    @JsonProperty("access_token_id")
    public String accessTokenId;

    @JsonProperty("user_id")
    public long userId;

    @JsonProperty("additional_signup_required")
    public boolean additionalSignupRequired;

    @JsonProperty("is_partial")
    public boolean isPartial;

    @JsonProperty("is_service")
    public boolean isService;

    @JsonProperty("source")
    public long source;

    @JsonProperty("source_description")
    public String sourceDescription;

    @JsonProperty("expires_in")
    public long expiresIn;
}
