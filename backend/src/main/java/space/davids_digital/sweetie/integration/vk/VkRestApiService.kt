package space.davids_digital.sweetie.integration.vk

import com.fasterxml.jackson.annotation.JsonProperty
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.cache.annotation.Cacheable
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.util.LinkedMultiValueMap
import org.springframework.util.MultiValueMap
import org.springframework.web.client.RestTemplate
import space.davids_digital.sweetie.integration.vk.dto.VkApiResponseDto
import space.davids_digital.sweetie.integration.vk.dto.VkConversationDto
import space.davids_digital.sweetie.integration.vk.dto.VkSilentTokenExchangeResultDto
import space.davids_digital.sweetie.integration.vk.dto.VkUserDto
import space.davids_digital.sweetie.rest.exception.InvalidSessionStateException
import space.davids_digital.sweetie.service.SessionService
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.*
import java.util.stream.Collectors

@Service
@Deprecated("")
class VkRestApiService @Autowired constructor(
    private val restTemplate: RestTemplate,
    private val sessionService: SessionService,
    @param:Qualifier("vkAccessToken") private val vkAccessToken: String,
    @param:Qualifier("vkAppServiceToken") private val vkAppServiceToken: String
) {
    @Cacheable(value = ["VkApiService.getConversations"])
    fun getConversations(vararg peerIds: Long): List<VkConversationDto> {
        if (peerIds.isEmpty()) {
            return listOf()
        }
        val params = HashMap<String, String>()
        params["peer_ids"] =
            Arrays.stream(peerIds).mapToObj { i: Long -> i.toString() }.collect(Collectors.joining(","))
        params["access_token"] = vkAccessToken
        params["v"] = "5.199"
        val result = call("messages.getConversationsById", params, GetConversationsCallApiResult::class.java)
        validateApiResponse(result)
        return result.response?.items ?: listOf()
    }

    @Cacheable(value = ["VkApiService.getUser"])
    fun getUser(userId: Long): VkUserDto {
        val users = getUsers(userId)
        if (users!!.isEmpty()) {
            throw RuntimeException("VK user not found by id $userId")
        }
        return users[0]
    }

    @Cacheable(value = ["VkApiService.getUsers"])
    fun getUsers(vararg userIds: Long): List<VkUserDto>? {
        if (userIds.size == 0) {
            return listOf()
        }
        val accessToken = sessionService.requireSession().vkAccessToken
        val params = HashMap<String, String>()
        params["user_ids"] =
            Arrays.stream(userIds).mapToObj { i: Long -> i.toString() }.collect(Collectors.joining(","))
        params["fields"] = "photo_200"
        params["lang"] = "ru"
        params["v"] = "5.199"
        params["access_token"] = accessToken
        val result = call("users.get", params, GetUsersCallApiResult::class.java)
        validateApiResponse(result)
        return result.response
    }

    fun exchangeSilentTokenToAccessToken(silentToken: String?, uuid: UUID): VkSilentTokenExchangeResultDto {
        val params = HashMap<String, String>()
        params["access_token"] = vkAppServiceToken
        params["token"] = URLEncoder.encode(silentToken, StandardCharsets.UTF_8)
        params["v"] = "5.131"
        params["uuid"] = uuid.toString()
        val result = call("auth.exchangeSilentAuthToken", params, VkExchangeSilentAuthTokenResponseDto::class.java)
        validateApiResponse(result)
        return result.response!!
    }

    private fun <T> call(method: String, params: Map<String, String>, responseType: Class<T>): T {
        log.info("VK API call: $method")
        val url = "https://api.vk.com/method/$method"
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_FORM_URLENCODED
        val map: MultiValueMap<String, String> = LinkedMultiValueMap()
        params.forEach { (key: String, value: String) -> map.add(key, value) }
        val requestEntity = HttpEntity(map, headers)
        return restTemplate.exchange(
            url,
            HttpMethod.POST,
            requestEntity,
            responseType
        ).body
    }

    private fun validateApiResponse(result: VkApiResponseDto) {
        if (result.error != null) {
            if (listOf(1116, 5).contains(result.error!!.errorCode)) {
                throw InvalidSessionStateException(
                    "VK token is invalid, please log in again"
                )
            }
            throw RuntimeException(
                "VK API error: code = " + result.error!!.errorCode + ", message = " + result.error!!.errorMsg
            )
        }
    }

    private class GetConversationsCallApiResult : VkApiResponseDto() {
        @JsonProperty("response")
        var response: CountAndItems? = null

        internal class CountAndItems {
            @JsonProperty("count")
            var count: Long = 0

            @JsonProperty("items")
            var items: List<VkConversationDto>? = null
        }
    }

    private class GetUsersCallApiResult : VkApiResponseDto() {
        @JsonProperty("response")
        var response: List<VkUserDto>? = null
    }

    private class VkExchangeSilentAuthTokenResponseDto : VkApiResponseDto() {
        @JsonProperty("response")
        var response: VkSilentTokenExchangeResultDto? = null
    }

    companion object {
        private val log = LoggerFactory.getLogger(VkRestApiService::class.java)
    }
}
