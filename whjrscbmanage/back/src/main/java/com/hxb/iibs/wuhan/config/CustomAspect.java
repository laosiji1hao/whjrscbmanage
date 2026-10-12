package com.hxb.iibs.wuhan.config;

import com.hxb.iibs.wuhan.util.ThreadLocalUtil;
import com.xxl.job.core.handler.annotation.XxlJob;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.RequestMapping;

@Aspect
@Component
public class CustomAspect {

//    @Before("within(@org.springframework.web.bind.annotation.RestController *)")
//    public void beforeController(JoinPoint joinPoint) {
//        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
//        String flowCode = signature.getMethod().getAnnotation(RequestMapping.class).value()[0];
//        ThreadLocalUtil.setFlowCode(flowCode);
//    }

    @Before("@annotation(com.xxl.job.core.handler.annotation.XxlJob)")
    public void beforeXxlJob(JoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String flowCode = signature.getMethod().getAnnotation(XxlJob.class).value();
        ThreadLocalUtil.setFlowCode("XxlJob - " + flowCode);
    }
}
