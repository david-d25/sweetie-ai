package space.davids_digital.vk_gpt_bot.integration.vk.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class VkUserDto {
    @JsonProperty("id")
    public long id;

    @JsonProperty("first_name")
    public String firstName;

    @JsonProperty("last_name")
    public String lastName;

    @JsonProperty("is_closed")
    public boolean isClosed;

    @JsonProperty("can_access_closed")
    public boolean canAccessClosed;

    @JsonProperty("photo_200")
    public String photo200;
}
