package space.davids_digital.sweetie

import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseCookie
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import space.davids_digital.sweetie.orm.service.UserSessionOrmService
import space.davids_digital.sweetie.rest.CookieName
import space.davids_digital.sweetie.rest.auth.AuthenticationFilter
import space.davids_digital.sweetie.rest.exception.InvalidSessionStateException

@Configuration
class SecurityConfig {
    @Value("\${COOKIES_DOMAIN}")
    var cookiesDomain = ""

    @Value("\${FRONTEND_HOST}")
    var frontendHost = ""

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val corsConfiguration = CorsConfiguration()
        corsConfiguration.allowedOrigins = listOf(frontendHost)
        corsConfiguration.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
        corsConfiguration.allowedHeaders = listOf("*")
        corsConfiguration.allowCredentials = true
        corsConfiguration.maxAge = 3600L

        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", corsConfiguration)
        return source
    }

    @Bean
    @Throws(Exception::class)
    fun filterChain(
        security: HttpSecurity,
        userSessionOrmService: UserSessionOrmService
    ): SecurityFilterChain {
        security
            .cors { it.configurationSource(corsConfigurationSource()) }
            .csrf { it.disable() }
            .authorizeHttpRequests {
                it
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    .requestMatchers("/auth/**", "/logout", "/ping").permitAll()
                    .anyRequest().authenticated()
            }
            .addFilterBefore(
                AuthenticationFilter(userSessionOrmService),
                UsernamePasswordAuthenticationFilter::class.java
            )
            .exceptionHandling {
                it.authenticationEntryPoint { _, response, _ -> handleAuthException(response) }
                it.accessDeniedHandler { _, response, _ -> handleAuthException(response) }
            }
            .logout { it.disable() }
        return security.build()
    }

    private fun handleAuthException(response: HttpServletResponse) {
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
        response.status = HttpStatus.FORBIDDEN.value()
        response.addHeader(HttpHeaders.SET_COOKIE, sessionTokenCookie.toString())
        response.addHeader(HttpHeaders.SET_COOKIE, userVkIdCookie.toString())
        response.contentType = "text/plain;charset=UTF-8"
    }
}
