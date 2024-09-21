package space.davids_digital.sweetie.integration.vk;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import space.davids_digital.sweetie.integration.vk.dto.VkApiResponseDto;
import space.davids_digital.sweetie.integration.vk.dto.VkConversationDto;
import space.davids_digital.sweetie.integration.vk.dto.VkSilentTokenExchangeResultDto;
import space.davids_digital.sweetie.integration.vk.dto.VkUserDto;
import space.davids_digital.sweetie.rest.exception.InvalidSessionStateException;
import space.davids_digital.sweetie.service.SessionService;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Deprecated
public class VkRestApiService {
    private static final Logger log = LoggerFactory.getLogger(VkRestApiService.class);

    private final RestTemplate restTemplate;
    private final SessionService sessionService;
    private final String vkAccessToken;
    private final String vkAppServiceToken;

    @Autowired
    public VkRestApiService(
            RestTemplate restTemplate,
            SessionService sessionService,
            @Qualifier("vkAccessToken")
            String vkAccessToken,
            @Qualifier("vkAppServiceToken")
            String vkAppServiceToken
    ) {
        this.restTemplate = restTemplate;
        this.sessionService = sessionService;
        this.vkAccessToken = vkAccessToken;
        this.vkAppServiceToken = vkAppServiceToken;
    }

    @Cacheable(value = "VkApiService.getConversations")
    public List<VkConversationDto> getConversations(long... peerIds) {
        if (peerIds.length == 0) {
            return List.of();
        }
        var params = new HashMap<String, String>();
        params.put("peer_ids", Arrays.stream(peerIds).mapToObj(Long::toString).collect(Collectors.joining(",")));
        params.put("access_token", vkAccessToken);
        params.put("v", "5.199");
        var result = call("messages.getConversationsById", params, GetConversationsCallApiResult.class);
        validateApiResponse(result);
        return result.response.items;
    }

    @Cacheable(value = "VkApiService.getUser")
    public VkUserDto getUser(long userId) {
        var users = getUsers(userId);
        if (users.isEmpty()) {
            throw new RuntimeException("VK user not found by id " + userId);
        }
        return users.get(0);
    }

    @Cacheable(value = "VkApiService.getUsers")
    public List<VkUserDto> getUsers(long... userIds) {
        if (userIds.length == 0) {
            return List.of();
        }
        var accessToken = sessionService.requireSession().vkAccessToken();
        var params = new HashMap<String, String>();
        params.put("user_ids", Arrays.stream(userIds).mapToObj(Long::toString).collect(Collectors.joining(",")));
        params.put("fields", "photo_200");
        params.put("lang", "ru");
        params.put("v", "5.199");
        params.put("access_token", accessToken);
        var result = call("users.get", params, GetUsersCallApiResult.class);
        validateApiResponse(result);
        return result.response;
    }

    public VkSilentTokenExchangeResultDto exchangeSilentTokenToAccessToken(String silentToken, UUID uuid) {
        var params = new HashMap<String, String>();
        params.put("access_token", vkAppServiceToken);
        params.put("token", URLEncoder.encode(silentToken, StandardCharsets.UTF_8));
        params.put("v", "5.131");
        params.put("uuid", uuid.toString());
        var result = call("auth.exchangeSilentAuthToken", params, VkExchangeSilentAuthTokenResponseDto.class);
        validateApiResponse(result);
        return result.response;
    }

    private <T> T call(String method, Map<String, String> params, Class<T> responseType) {
        log.info("VK API call: " + method);
        var url = "https://api.vk.com/method/" + method;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        params.forEach(map::add);
        HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(map, headers);
        return restTemplate.exchange(
                url,
                HttpMethod.POST,
                requestEntity,
                responseType
        ).getBody();
    }

    private void validateApiResponse(VkApiResponseDto result) {
        if (result.error != null) {
            if (List.of(1116, 5).contains(result.error.errorCode)) {
                throw new InvalidSessionStateException(
                        "VK token is invalid, please log in again"
                );
            }
            throw new RuntimeException(
                    "VK API error: code = " + result.error.errorCode + ", message = " + result.error.errorMsg
            );
        }
    }

    private static class GetConversationsCallApiResult extends VkApiResponseDto  {
        @JsonProperty("response")
        CountAndItems response;

        static class CountAndItems {
            @JsonProperty("count")
            long count;

            @JsonProperty("items")
            List<VkConversationDto> items;
        }
    }

    private static class GetUsersCallApiResult extends VkApiResponseDto {
        @JsonProperty("response")
        List<VkUserDto> response;
    }

    private static class VkExchangeSilentAuthTokenResponseDto extends VkApiResponseDto {
        @JsonProperty("response")
        VkSilentTokenExchangeResultDto response;
    }
}
