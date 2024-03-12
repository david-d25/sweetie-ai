package space.davids_digital.vk_gpt_bot.integration.openai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ModelDto {
    @JsonProperty("id")
    public String id;

    @JsonProperty("object")
    public String object;

    @JsonProperty("created")
    public long created;

    @JsonProperty("owned_by")
    public String ownedBy;
}
