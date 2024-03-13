package space.davids_digital.vk_gpt_bot;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.servlet.server.ServletWebServerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.lang.NonNull;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import javax.sql.DataSource;
import java.util.List;

@EnableWebMvc
@EnableScheduling
@ComponentScan("space.davids_digital.vk_gpt_bot")
@SpringBootConfiguration
public class WebConfig {
    @Value("${DB_HOST:localhost}")
    String dbHost;
    @Value("${DB_PORT:5432}")
    int dbPort;
    @Value("${DB_NAME}")
    String dbName;
    @Value("${DB_USER}")
    String dbUsername;
    @Value("${DB_PASSWORD}")
    String dbPassword;
    @Value("${VK_APP_SERVICE_TOKEN}")
    String vkAppServiceToken;
    @Value("${VK_APP_ID}")
    long vkAppId;
    @Value("${GENERAL_SECRET_KEY_BASE64}")
    String generalSecretKeyBase64;
    @Value("${FRONTEND_BASE_PATH}")
    String frontendBasePath;
    @Value("${FRONTEND_HOST}")
    String frontendHost;
    @Value("${VK_ACCESS_TOKEN}")
    String vkAccessToken;
    @Value("${OPENAI_SECRET_KEY}")
    String openaiSecretKey;
    @Value("${COOKIES_DOMAIN}")
    String cookiesDomain;

    @Bean
    public ServletWebServerFactory servletWebServerFactory() {
        return new TomcatServletWebServerFactory();
    }

    @Bean
    public DataSource dataSource() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.postgresql.Driver");
        dataSource.setUrl(String.format("jdbc:postgresql://%s:%d/%s", dbHost, dbPort, dbName));
        dataSource.setUsername(dbUsername);
        dataSource.setPassword(dbPassword);
        return dataSource;
    }

    @Bean
    public RestTemplate restTemplate() {
        RestTemplate restTemplate = new RestTemplate();
        List<HttpMessageConverter<?>> messageConverters = restTemplate.getMessageConverters();
        messageConverters.add(new MappingJackson2HttpMessageConverter());
        restTemplate.setMessageConverters(messageConverters);
        return restTemplate;
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(@NonNull CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins(frontendHost)
                        .allowCredentials(true);
            }
        };
    }

    @Bean
    @Qualifier("vkAppServiceToken")
    public String vkAppServiceToken() {
        return vkAppServiceToken;
    }

    @Bean
    @Qualifier("generalSecretKeyBase64")
    public String generalSecretKeyBase64() {
        return generalSecretKeyBase64;
    }

    @Bean
    @Qualifier("frontendBasePath")
    public String frontendBasePath() {
        return frontendBasePath;
    }

    @Bean
    @Qualifier("frontendHost")
    public String frontendHost() {
        return frontendHost;
    }

    @Bean
    @Qualifier("vkAccessToken")
    public String vkAccessToken() {
        return vkAccessToken;
    }

    @Bean
    @Qualifier("openaiSecretKey")
    public String openaiSecretKey() {
        return openaiSecretKey;
    }

    @Bean
    @Qualifier("cookiesDomain")
    public String cookiesDomain() {
        return cookiesDomain;
    }
}
