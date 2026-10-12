package com.hxb.iibs.wuhan.config;

import com.ctrip.framework.apollo.model.ConfigChange;
import com.ctrip.framework.apollo.model.ConfigChangeEvent;
import com.ctrip.framework.apollo.spring.annotation.ApolloConfigChangeListener;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.logging.LogLevel;
import org.springframework.boot.logging.LoggingSystem;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class LogLevelRefreshHandler {

    @Autowired
    private LoggingSystem loggingSystem;

    @ApolloConfigChangeListener
    private void onApolloConfigChange(ConfigChangeEvent event) {
        log.info("apolloConfigChanged: {}", String.join(",", event.changedKeys()));
        for (String key : event.changedKeys()) {
            if ("app.log.level".equals(key) || "mapper.log.level".equals(key)) {
                ConfigChange change = event.getChange(key);
                String oldLevel = change.getOldValue();
                String newLevel = change.getNewValue();
                log.info("已修改日志级别配置 {}: {} ---> {}", key, oldLevel, newLevel);
                if ("app.log.level".equals(key)) {
                    loggingSystem.setLogLevel(LoggingSystem.ROOT_LOGGER_NAME, LogLevel.valueOf(newLevel));
                } else {
                    loggingSystem.setLogLevel("com.hxb.iibs.wuhan.mapper", LogLevel.valueOf(newLevel));
                }
            }
        }
    }
}
