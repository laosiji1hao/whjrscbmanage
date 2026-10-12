package com.hxb.iibs.wuhan.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Configuration
public class AppConfig {

    @Bean
    public RestTemplate restTemplate(CustomClientHttpRequestInterceptor customClientHttpRequestInterceptor) {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.getInterceptors().add(customClientHttpRequestInterceptor);
        return restTemplate;
    }
}
