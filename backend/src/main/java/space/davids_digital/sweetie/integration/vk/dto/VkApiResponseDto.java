package space.davids_digital.sweetie.integration.vk.dto;

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
