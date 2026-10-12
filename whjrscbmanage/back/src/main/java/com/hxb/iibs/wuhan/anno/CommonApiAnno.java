package com.hxb.iibs.wuhan.anno;

import org.springframework.core.annotation.AliasFor;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.METHOD;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

/**
 * 公共服务接口注解
 */
@Documented
@Retention(RUNTIME)
@Target(METHOD)
public @interface CommonApiAnno {
    @AliasFor("transCode")
    String value() default "";

    @AliasFor("value")
    String transCode() default "";
}
