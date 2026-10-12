package com.hxb.iibs.wuhan.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * 跨域过滤器，在最早期处理 OPTIONS 预检请求。
 * 本地开发时启用，生产环境由网关统一处理。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorsFilter implements Filter {

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletResponse response = (HttpServletResponse) res;
        HttpServletRequest request = (HttpServletRequest) req;

        // 本地开发允许所有来源，实际使用时替换为具体域名或从配置读取
        String origin = request.getHeader("Origin");
        if (origin == null || origin.isEmpty()) {
            origin = "*";
        }

        response.setHeader("Access-Control-Allow-Origin", origin);
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "*, Authorization, Content-Type, X-Requested-With");
        response.setHeader("Access-Control-Expose-Headers", "*");
        response.setHeader("Access-Control-Max-Age", "3600");

        // 对预检请求直接返回，不继续往下走
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        chain.doFilter(req, res);
    }
}