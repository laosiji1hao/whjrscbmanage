package com.hxb.iibs.wuhan.anno;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.METHOD;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

/**
 * 接口无需认证
 */
@Documented
@Retention(RUNTIME)
@Target(METHOD)
public @interface NoNeedAuth {
}
