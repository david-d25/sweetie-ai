package com.davids_digital.vk_gpt_bot;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.servlet.server.ServletWebServerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import javax.sql.DataSource;

@EnableWebMvc
@ComponentScan("com.davids_digital.vk_gpt_bot")
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
}
