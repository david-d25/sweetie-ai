package space.davids_digital.vk_gpt_bot.integration.vk.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class VkApiResponseDto {
    @JsonProperty("error")
    public Error error;

    public static class Error {
        @JsonProperty("error_code")
        public int errorCode;

        @JsonProperty("error_msg")
        public String errorMsg;
    }
}
