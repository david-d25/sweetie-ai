package space.davids_digital.sweetie

import com.vk.api.sdk.client.VkApiClient
import com.vk.api.sdk.client.actors.GroupActor
import com.vk.api.sdk.httpclient.HttpTransportClient
import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.HttpRequestRetry
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import jakarta.annotation.PostConstruct
import kotlinx.serialization.json.Json
import org.flywaydb.core.Flyway
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.SpringBootConfiguration
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory
import org.springframework.boot.web.servlet.server.ServletWebServerFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.ComponentScan
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter
import org.springframework.jdbc.datasource.DriverManagerDataSource
import org.springframework.scheduling.annotation.EnableScheduling
import org.springframework.web.client.RestTemplate
import org.springframework.web.servlet.config.annotation.EnableWebMvc
import java.io.PrintStream
import javax.sql.DataSource

@EnableWebMvc
@EnableScheduling
@ComponentScan("space.davids_digital.sweetie")
@EnableConfigurationProperties
@SpringBootConfiguration
class WebConfig {
    @Value("\${app.version}")
    var appVersion = ""

    @Value("\${DB_HOST:localhost}")
    var dbHost = ""

    @Value("\${DB_PORT:5432}")
    var dbPort = 0

    @Value("\${DB_NAME}")
    var dbName = ""

    @Value("\${DB_USER}")
    var dbUsername = ""

    @Value("\${DB_PASSWORD}")
    var dbPassword = ""

    @Value("\${VK_APP_SERVICE_TOKEN}")
    var vkAppServiceToken = ""

    @Value("\${VK_APP_ID}")
    var vkAppId = 0L

    @Value("\${VK_ACCESS_TOKEN}")
    var vkAccessToken = ""

    @Value("\${VK_GROUP_ID}")
    var vkGroupId = 0L

    @Value("\${GENERAL_SECRET_KEY_BASE64}")
    var generalSecretKeyBase64 = ""

    @Value("\${FRONTEND_BASE_PATH}")
    var frontendBasePath = ""

    @Value("\${FRONTEND_HOST}")
    var frontendHost = ""

    @Value("\${OPENAI_SECRET_KEY}")
    var openaiSecretKey = ""

    @Value("\${COOKIES_DOMAIN}")
    var cookiesDomain = ""

    @Value("\${STABILITY_AI_API_KEY}")
    var stabilityAiApiKey = ""

    @PostConstruct
    fun init() {
        // This is a special trick to get rid of the println calls from com.vk.api.sdk.events.CallbackEvent.parse
        System.setOut(object : PrintStream(System.out, true) {
            override fun println(x: String?) {
                val stack = Thread.currentThread().stackTrace
                if (stack.size >= 3
                    && stack[2].className == "com.vk.api.sdk.events.CallbackEvent"
                    && stack[2].methodName == "parse"
                ) {
                    return
                }
                super.println(x)
            }
        })
    }

    @Bean
    fun servletWebServerFactory(): ServletWebServerFactory {
        return TomcatServletWebServerFactory()
    }

    @Bean
    fun dataSource(): DataSource {
        val dataSource = DriverManagerDataSource()
        dataSource.setDriverClassName("org.postgresql.Driver")
        dataSource.url = "jdbc:postgresql://$dbHost:$dbPort/$dbName"
        dataSource.username = dbUsername
        dataSource.password = dbPassword
        return dataSource
    }

    @Bean
    fun restTemplate(): RestTemplate {
        val restTemplate = RestTemplate()
        val messageConverters = restTemplate.messageConverters
        messageConverters.add(MappingJackson2HttpMessageConverter())
        restTemplate.messageConverters = messageConverters
        return restTemplate
    }

    @Bean
    fun flyway(): Flyway {
        return Flyway.configure()
            .dataSource(dataSource())
            .baselineOnMigrate(true)
            .load().also {
                it.migrate()
            }
    }

    @Bean
    fun httpClient() = HttpClient(CIO) {
        install(ContentNegotiation) {
            json(Json {
                explicitNulls = false
                ignoreUnknownKeys = true
                isLenient = true
                encodeDefaults = true
                prettyPrint = false
                coerceInputValues = true
            })
        }
        install(HttpRequestRetry) {
            retryOnServerErrors(maxRetries = 5)
            exponentialDelay()
        }
        engine {
            requestTimeout = 10 * 60 * 1000L
        }
    }

    @Bean
    @Qualifier("vkAppServiceToken")
    fun vkAppServiceToken(): String {
        return vkAppServiceToken
    }

    @Bean
    @Qualifier("generalSecretKeyBase64")
    fun generalSecretKeyBase64(): String {
        return generalSecretKeyBase64
    }

    @Bean
    @Qualifier("frontendBasePath")
    fun frontendBasePath(): String {
        return frontendBasePath
    }

    @Bean
    @Qualifier("frontendHost")
    fun frontendHost(): String {
        return frontendHost
    }

    @Bean
    @Qualifier("vkAccessToken")
    fun vkAccessToken(): String {
        return vkAccessToken
    }

    @Bean
    @Qualifier("openaiSecretKey")
    fun openaiSecretKey(): String {
        return openaiSecretKey
    }

    @Bean
    @Qualifier("cookiesDomain")
    fun cookiesDomain(): String {
        return cookiesDomain
    }

    @Bean
    @Qualifier("vkGroupId")
    fun vkGroupId(): Long {
        return vkGroupId
    }

    @Bean
    @Qualifier("appVersion")
    fun appVersion(): String {
        return appVersion
    }

    @Bean
    @Qualifier("stabilityAiApiKey")
    fun stabilityAiApiKey(): String {
        return stabilityAiApiKey
    }

    @Bean
    fun vkApiClient(): VkApiClient {
        return VkApiClient(HttpTransportClient.getInstance())
    }

    @Bean
    fun vkGroupActor(): GroupActor {
        return GroupActor(vkGroupId, vkAccessToken)
    }
}
