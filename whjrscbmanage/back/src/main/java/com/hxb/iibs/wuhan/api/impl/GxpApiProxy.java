package com.hxb.iibs.wuhan.api.impl;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.hxb.iibs.wuhan.anno.GxpApiAnno;
import com.hxb.iibs.wuhan.exception.ApiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;

@Slf4j
@Service
public class GxpApiProxy implements InvocationHandler {

    @Value("${gxp.url}")
    private String gxpUrl;
    @Autowired
    private RestTemplate restTemplate;

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        // 打印信息
        String reqUrl = gxpUrl + method.getAnnotation(GxpApiAnno.class).url();
        HttpMethod httpMethod = HttpMethod.valueOf(method.getAnnotation(GxpApiAnno.class).method());
        log.info("调用方法为: {}，对应GXP请求路径为: [{}] {}", method.getName(), httpMethod.name(), reqUrl);
        log.info("调用方法参数为: {}", JSON.toJSONString(args));

        // 发送请求
        if (httpMethod.equals(HttpMethod.GET)) {
            return this.handleRequest(reqUrl);
        } else {
            // 设置请求头
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Object> body = new HttpEntity<>(args[0], headers);
            String respData = this.handleRequest(reqUrl, body);
            return JSONObject.parseObject(respData);
        }
    }

    /**
     * 发送请求的统一方法
     *
     * @param reqUrl 接口请求路径
     * @param method  请求方法，默认 POST
     * @param entity  请求体
     * @param respKey 响应体要抽取的 key，默认 data
     * @return 响应体的 key
     */
    private String handleRequest(String reqUrl, HttpMethod method, HttpEntity<?> entity, String respKey) {
        ResponseEntity<String> response;
        try {
            // 发送 POST 请求并获取响应
            response = restTemplate.exchange(reqUrl, method, entity, String.class);
        } catch (ResourceAccessException e) { // 处理网络问题
            log.error("Network Issue: {}", e.getMessage());
            throw new ApiException("99997", "网络异常");
        } catch (Exception e) { // 处理其他异常情况
            log.error("Error: {}", e.getMessage());
            throw new ApiException("99996", "未知异常");
        }

        // 打印响应状态码和响应体
        log.info("Status: {}", response.getStatusCode());
        log.info("Response: {}", response.getBody());

        JSONObject resp = JSONObject.parseObject(response.getBody());
        if (resp.containsKey("code") && 200 == resp.getIntValue("code")) {
            return resp.getString(respKey);
        } else {
            log.error("请求失败: {}", resp.getString("msg"));
            throw new ApiException("99998", resp.getString("msg"));
        }
    }

    private String handleRequest(String reqUrl, HttpEntity<?> entity) {
        return this.handleRequest(reqUrl, HttpMethod.POST, entity, "data");
    }

    private String handleRequest(String reqUrl) {
        return this.handleRequest(reqUrl, HttpMethod.GET, null, "data");
    }
}
