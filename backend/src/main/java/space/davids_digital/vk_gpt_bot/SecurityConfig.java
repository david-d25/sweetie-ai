package space.davids_digital.vk_gpt_bot;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import space.davids_digital.vk_gpt_bot.orm.service.UserSessionOrmService;
import space.davids_digital.vk_gpt_bot.rest.auth.AuthenticationFilter;

@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity security,
            UserSessionOrmService userSessionOrmService
    ) throws Exception {
        security
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(authorizeRequests ->
                        authorizeRequests
                                .requestMatchers("/auth/**", "/logout", "/sticker-pack/**").permitAll()
                                .anyRequest().authenticated()
                )
                .addFilterBefore(
                        new AuthenticationFilter(userSessionOrmService),
                        UsernamePasswordAuthenticationFilter.class
                )
                .logout(AbstractHttpConfigurer::disable);
        return security.build();
    }
}
