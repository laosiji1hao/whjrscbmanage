package com.hxb.iibs.wuhan.anno;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import java.lang.annotation.*;

/**
 * 流程编号注解<br/>
 * 动态请求路径相关，暂未实现
 */
@Documented
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@RequestMapping(method=RequestMethod.POST)
public @interface FlowCodeAnno {
    String value() default "";
}