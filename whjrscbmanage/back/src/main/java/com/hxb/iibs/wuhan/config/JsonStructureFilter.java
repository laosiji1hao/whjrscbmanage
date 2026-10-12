package com.hxb.iibs.wuhan.config;

import com.alibaba.fastjson2.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

/**
 * 在请求进入 Controller 之前解开 iassist 外层包装。
 *
 * <p>iassist 协议报文格式：{@code {iibs:{req:{body:{业务字段...}}}}
 * 本 Filter 从 {@code $.iibs.req.body} 提取内层业务 JSON，
 * 用干净的 body 替换原请求体，使后续 Controller 可直接 {@code @RequestBody DTO} 接收。</p>
 *
 * <p>参考 ycmigrantworkerspay 项目 {@code JsonStructureFilter} 的实现模式。</p>
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class JsonStructureFilter implements jakarta.servlet.Filter {

    /**
     * 对 POST 请求执行解包，非 POST 请求直接透传。
     *
     * <ul>
     *   <li>读取原始请求体（一次性消费）</li>
     *   <li>解析 JSON，取 {@code $.iibs.req.body}</li>
     *   <li>用 DelegatingServletInputStream 将干净内容重新注入 request</li>
     *   <li>若报文不符合预期结构则静默放行，不阻断业务流程</li>
     * </ul>
     *
     * @param servletRequest  原始 HttpServletRequest，InputStream 仅可读一次
     * @param servletResponse 响应对象，原样透传
     * @param chain           后续 Filter 链，继续传递已替换的 request
     */
    @Override
    public void doFilter(jakarta.servlet.ServletRequest servletRequest,
                         jakarta.servlet.ServletResponse servletResponse,
                         FilterChain chain) throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;

        // 只处理 POST 请求，GET 等直接放行
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        // 一次性把原始 body 读完（此后 InputStream 已耗尽，靠 DelegatingServletInputStream 重制）
        String raw = StreamUtils.copyToString(request.getInputStream(), StandardCharsets.UTF_8);

        try {
            JSONObject root = JSONObject.parseObject(raw);
            JSONObject ibody = root.getJSONObject("iibs")
                                   .getJSONObject("req")
                                   .getJSONObject("body");
            String clean = ibody.toJSONString();

            log.debug("JsonStructureFilter 解包完成，内层长度={}", clean.length());

            // 把干净的内层 JSON 重新包装为可重复读的流，透传给后续 Filter 和 Controller
            HttpServletRequest replaced = new HttpServletRequestWrapper(request) {
                @Override
                public ServletInputStream getInputStream() {
                    return new DelegatingServletInputStream(
                            clean.getBytes(StandardCharsets.UTF_8));
                }

                @Override
                public BufferedReader getReader() {
                    return new BufferedReader(
                            new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
                }
            };

            chain.doFilter(replaced, response);

        } catch (NullPointerException | IllegalArgumentException e) {
            // 非标准报文（如不含 iibs.req.body 的测试接口）直接透传，不阻断业务流程
            log.trace("非标准报文格式，跳过解包: {}", e.getMessage());
            chain.doFilter(request, response);
        }
    }
}