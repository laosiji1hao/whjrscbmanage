package com.hxb.iibs.wuhan.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 拦截器配置。
 */
@Configuration
public class CustomWebMvcConfigurer implements WebMvcConfigurer {

    @Autowired
    private CustomInterceptor customInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(customInterceptor).addPathPatterns("/flowservice/json/*").excludePathPatterns("");
    }
}