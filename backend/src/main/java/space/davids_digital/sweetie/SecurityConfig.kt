package space.davids_digital.sweetie

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import space.davids_digital.sweetie.orm.service.UserSessionOrmService
import space.davids_digital.sweetie.rest.auth.AuthenticationFilter

@Configuration
class SecurityConfig {
    @Bean
    @Throws(Exception::class)
    fun filterChain(
        security: HttpSecurity,
        userSessionOrmService: UserSessionOrmService
    ): SecurityFilterChain {
        security
            .csrf { it.disable() }
            .authorizeHttpRequests {
                it.requestMatchers("/auth/**", "/logout", "/sticker-pack/**")
                    .permitAll()
                    .anyRequest()
                    .authenticated()
            }
            .addFilterBefore(
                AuthenticationFilter(userSessionOrmService),
                UsernamePasswordAuthenticationFilter::class.java
            )
            .logout { it.disable() }
        return security.build()
    }
}
