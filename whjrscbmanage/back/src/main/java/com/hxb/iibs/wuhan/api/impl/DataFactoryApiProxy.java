package com.hxb.iibs.wuhan.api.impl;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.hxb.iibs.wuhan.anno.DataFactoryApiAnno;
import com.hxb.iibs.wuhan.exception.ApiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestTemplate;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class DataFactoryApiProxy implements InvocationHandler {

    @Autowired
    private Environment environment;
    @Autowired
    private RestTemplate restTemplate;

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        if (method.getName().equals("toString")) {
            return "Proxy@" + System.identityHashCode(proxy) + " of IDataFactoryApi";
        }

        if (method.isDefault()) {
            return InvocationHandler.invokeDefault(proxy, method, args);
        }

        DataFactoryApiAnno anno = AnnotationUtils.getAnnotation(method, DataFactoryApiAnno.class);
        String path = anno.path();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-token", environment.getProperty("datafactory.token"));

        Map<String, Object> reqBody = new HashMap<>();
        reqBody.put("inFields", (Map<String, Object>) args[0]);

        HttpEntity<Object> entity = new HttpEntity<>(reqBody, headers);
        String url = environment.getProperty("datafactory.url") + path;
        log.info("数据工厂请求, url={}", url);

        String result = restTemplate.postForObject(url, entity, String.class);
        log.info("数据工厂响应, result={}", result);

        JSONObject json = JSON.parseObject(result);
        Boolean success = json.getBoolean("success");
        if (success == null || !success) {
            throw new ApiException(
                    String.valueOf(json.getOrDefault("errorCode", "DF_ERR")),
                    json.getString("errorInfo"));
        }

        return json;
    }
}