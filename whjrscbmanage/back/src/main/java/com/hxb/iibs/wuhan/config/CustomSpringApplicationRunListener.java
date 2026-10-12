package com.hxb.iibs.wuhan.config;

import com.hxb.iibs.wuhan.util.YamlUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ConfigurableBootstrapContext;
import org.springframework.boot.SpringApplicationRunListener;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.EnumerablePropertySource;
import org.springframework.core.env.MapPropertySource;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * <ul>
 * <li>自定义 SpringApplicationRunListener</li>
 * <li>监听 environmentPrepared 事件，解密参数</li>
 * <li>需要配置 spring.factories 否则不生效</li>
 * </ul>
 */
@Slf4j
public class CustomSpringApplicationRunListener implements SpringApplicationRunListener {

    @Override
    public void environmentPrepared(ConfigurableBootstrapContext bootstrapContext, ConfigurableEnvironment environment) {
        log.info("参数已加载完成");

        Map<String, Object> customProperties = new HashMap<>();
        environment.getPropertySources().stream().filter(propertySource -> propertySource.getName().contains("application.yml")).forEach(propertySource -> {
            EnumerablePropertySource<?> enumerablePropertySource = (EnumerablePropertySource<?>) propertySource;
            for (String key : enumerablePropertySource.getPropertyNames()) {
                if (environment.getProperty(key).startsWith("ENC[")) {
                    customProperties.put(key, this.decrypt(environment.getProperty(key)));
                    log.info("已解密参数：{}", key);
                }
            }
        });

        MapPropertySource ps = new MapPropertySource("myCustomSource", customProperties);
        environment.getPropertySources().addFirst(ps); // 追加到 first 生效
    }

    private String decrypt(String encValue) {
        try {
            return YamlUtil.decrypt(encValue.substring(4, encValue.length() - 1));
        } catch (Exception e) {
            return encValue;
        }
    }
}