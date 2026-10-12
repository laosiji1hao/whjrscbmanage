package com.hxb.iibs.wuhan.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;

// 确保顺序在最后，以便包装所有其他响应逻辑
@Order
@Component
public class ForceContentLengthFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        // 仅针对 HTTP 请求处理
        if (response instanceof HttpServletResponse httpResponse) {

            // 使用包装类捕获输出流内容
            ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(httpResponse);

            try {
                // 1. 继续执行后续的过滤器链和 Controller 逻辑
                chain.doFilter(request, wrappedResponse);
            } finally {
                // 2. 在响应真正提交给客户端之前进行处理
                // 注意：这里需要判断是否已经提交，虽然 copyBodyToResponse 会处理，但逻辑上要清晰
                byte[] content = wrappedResponse.getContentAsByteArray();

                // 只有当有内容且没有发生重定向等特殊情况时才处理
                if (content.length > 0 && !httpResponse.isCommitted()) {
                    // 关键步骤：显式设置 Content-Length
                    // 这会迫使 Tomcat/Jetty 移除 Transfer-Encoding: chunked
                    httpResponse.setContentLength(content.length);

                    // 3. 将缓存的内容真正写回给客户端
                    wrappedResponse.copyBodyToResponse();
                } else {
                    // 如果没有内容（例如 304 或空响应），也要确保复制回去
                    wrappedResponse.copyBodyToResponse();
                }
            }
        } else {
            chain.doFilter(request, response);
        }
    }
}
