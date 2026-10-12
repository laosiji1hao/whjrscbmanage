package com.hxb.iibs.wuhan;

import com.ctrip.framework.apollo.spring.annotation.EnableApolloConfig;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@EnableApolloConfig
@MapperScan("com.hxb.iibs.wuhan.mapper")
public class AppApplication {

    public static void main(String[] args) {
        SpringApplication.run(AppApplication.class, args);
    }

}
