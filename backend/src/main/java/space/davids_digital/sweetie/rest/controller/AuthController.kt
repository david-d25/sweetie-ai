package space.davids_digital.sweetie.rest.controller

import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.json.JsonMapper
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseCookie
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import space.davids_digital.sweetie.integration.vk.VkAuthService
import space.davids_digital.sweetie.rest.CookieName.AUTH_TOKEN
import space.davids_digital.sweetie.rest.CookieName.USER_VK_ID
import java.net.URI
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.time.ZonedDateTime
import java.util.*

@RestController
@RequestMapping("/auth")
class AuthController(
    private val vkAuthService: VkAuthService,
    @Qualifier("frontendBasePath")
    private val frontendBasePath: String,
    @Qualifier("cookiesDomain")
    private val cookiesDomain: String,
    @Qualifier("frontendHost")
    private val frontendHost: String
) {
    companion object {
        private val log = LoggerFactory.getLogger(AuthController::class.java)
    }

    @GetMapping("vk-id")
    @ResponseBody
    fun authVkId(
        @RequestParam("payload") payload: String,
        @RequestParam("state") state: String
    ): ResponseEntity<*> {
        return try {
            val mapper = JsonMapper()
            mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
            val decodedPayload = URLDecoder.decode(payload, StandardCharsets.UTF_8)
            val dto = mapper.readValue(decodedPayload, VkAuthRedirectPayloadDto::class.java)
            val (_, userVkId, sessionToken, _, _, validUntil) = vkAuthService.createSessionFromSilentToken(
                dto.token,
                dto.uuid
            )
            val url = URI.create("$frontendHost/").resolve("$frontendBasePath/").resolve("login")
            val maxAge = validUntil.minusSeconds(ZonedDateTime.now().toEpochSecond()).toEpochSecond()
            val sessionTokenCookie = ResponseCookie.from(AUTH_TOKEN, sessionToken)
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .domain(cookiesDomain)
                .maxAge(maxAge)
                .path("/")
                .build()
            val userVkIdCookie = ResponseCookie.from(USER_VK_ID, userVkId.toString())
                .secure(true)
                .sameSite("Strict")
                .domain(cookiesDomain)
                .maxAge(maxAge)
                .path("/")
                .build()
            ResponseEntity.status(HttpStatus.TEMPORARY_REDIRECT)
                .location(url)
                .header(HttpHeaders.SET_COOKIE, sessionTokenCookie.toString())
                .header(HttpHeaders.SET_COOKIE, userVkIdCookie.toString())
                .build<Any>()
        } catch (e: Exception) {
            log.error("Failed to authenticate", e)
            val url = URI.create("$frontendHost/").resolve("$frontendBasePath/").resolve("login?status=error")
            ResponseEntity.status(HttpStatus.TEMPORARY_REDIRECT).location(url).build<Any>()
        }
    }

    private data class VkAuthRedirectPayloadDto (
        var token: String = "",
        var uuid: UUID = UUID.fromString("00000000-0000-0000-0000-000000000000")
    )
}
