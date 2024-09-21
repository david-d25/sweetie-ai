package space.davids_digital.sweetie

import org.springframework.boot.SpringApplication
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration

fun main(args: Array<String>) {
    SpringApplication.run(WebConfig::class.java, *args)
}

@SpringBootApplication(exclude = [UserDetailsServiceAutoConfiguration::class])
class WebApp
