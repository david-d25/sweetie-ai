package space.davids_digital.sweetie.rest

import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseCookie
import org.springframework.http.ResponseEntity

fun ResponseEntity.BodyBuilder.removeAuthCookies(cookiesDomain: String): ResponseEntity.BodyBuilder {
    val sessionTokenCookie = ResponseCookie.from(CookieName.AUTH_TOKEN, "")
        .maxAge(0)
        .httpOnly(true)
        .secure(true)
        .path("/")
        .sameSite("Strict")
        .domain(cookiesDomain)
        .build()
    val userVkIdCookie = ResponseCookie.from(CookieName.USER_VK_ID, "")
        .maxAge(0)
        .secure(true)
        .path("/")
        .sameSite("Strict")
        .domain(cookiesDomain)
        .build()
    this.header(HttpHeaders.SET_COOKIE, sessionTokenCookie.toString())
    this.header(HttpHeaders.SET_COOKIE, userVkIdCookie.toString())
    return this
}