package com.hxb.iibs.wuhan.anno;

import java.lang.annotation.*;

@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface DataFactoryApiAnno {

    /** 网关路径，如 /api/gateway/cms_no_td_info */
    String path() default "";
}