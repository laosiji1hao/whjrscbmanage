package com.hxb.iibs.wuhan.config;

import com.hxb.iibs.wuhan.anno.GxpApiAnno;
import com.hxb.iibs.wuhan.service.IHxbCpodFhcharProductSerialService;
import com.hxb.iibs.wuhan.util.ThreadLocalUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

@Slf4j
@Service
public class CustomInterceptor implements HandlerInterceptor {

    @Autowired
    private IHxbCpodFhcharProductSerialService cpodService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        log.info("开始处理请求: {}", request.getRequestURI());

        if (!(handler instanceof HandlerMethod)) {
            return true; // 静态资源或其他非控制器处理器，放行
        }
        HandlerMethod method = (HandlerMethod)handler;
        method.getMethodAnnotation(GxpApiAnno.class);
        long startTime = System.currentTimeMillis();
        request.setAttribute("startTime", startTime);

        // 记录请求路径
        ThreadLocalUtil.setFlowCode(request.getServletPath());

        // 添加拦截器处理 CORS，本地测试时可打开
//        response.setHeader("Access-Control-Allow-Origin", "*");
//        response.setHeader("Access-Control-Allow-Headers", "content-type");
//        response.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS,DELETE, PUT");

        // 返回true表示继续处理请求，false则阻止处理
        return true;
    }

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler,
                           ModelAndView modelAndView) throws Exception {
        long endTime = System.currentTimeMillis();
        long startTime = (long) request.getAttribute("startTime");
        log.info("请求处理完成: {}，耗时 {} 毫秒", request.getRequestURI(), endTime - startTime);

        // 异步处理逻辑
        new Thread(() -> {
            cpodService.updateCpod(ThreadLocalUtil.getHxbCpodAmt());
        }).start();
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler,
                                Exception ex) throws Exception {
        long endTime = System.currentTimeMillis();
        long startTime = (long) request.getAttribute("startTime");
        log.info("请求完全完成: {}，耗时 {} 毫秒", request.getRequestURI(), endTime - startTime);
    }
}