package space.davids_digital.sweetie;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = {UserDetailsServiceAutoConfiguration.class})
public class WebApp {
    public static void main(String[] args) {
        SpringApplication.run(WebConfig.class, args);
    }
}
