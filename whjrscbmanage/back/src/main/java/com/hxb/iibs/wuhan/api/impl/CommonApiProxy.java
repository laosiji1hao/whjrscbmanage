package com.hxb.iibs.wuhan.api.impl;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONPath;
import com.hxb.iibs.wuhan.anno.CommonApiAnno;
import com.hxb.iibs.wuhan.exception.ApiException;
import com.hxb.iibs.wuhan.util.ConcurrentHashMapCache;
import com.hxb.iibs.wuhan.util.ThreadLocalUtil;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Base64;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class CommonApiProxy implements InvocationHandler {

    // 配置参数前缀
    public static final String KEY_PREFIX = "common.api.";

    @Autowired
    private Environment environment;
    @Autowired
    private RestTemplate restTemplate;

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        // 对 toString 方法的特殊处理
        if (method.getName().equals("toString")) {
            return "Proxy@" + System.identityHashCode(proxy) + " of ICommonApi";
        }

        // 对接口的 default 方法的特殊处理
        if (method.isDefault()) {
            return InvocationHandler.invokeDefault(proxy, method, args);
        }

        // 打印信息
        log.info("调用接口: ICommonApi.{}", method.getName());
        String transCode = AnnotationUtils.getAnnotation(method, CommonApiAnno.class).transCode();
        log.info("交易码: {}", transCode);

        String retMsg;
        if (1 == args.length) {
            retMsg = this.getCommonService(transCode, (Map<String, Object>) args[0]);
        } else {
            retMsg = this.getCommonService(transCode, (Map<String, Object>) args[0], (Map<String, Object>) args[1]);
        }
        String respCode = JSONPath.extract(retMsg, "$.iibs.resp.head.respCode").toString();
        if (respCode.equals("00000")) {
            if (JSONPath.contains(retMsg, "$.iibs.resp.body")) {
                return JSON.parseObject(JSONPath.extract(retMsg, "$.iibs.resp.body").toString());
            } else {
                return null;
            }
        } else {
            String respMsg = JSONPath.extract(retMsg, "$.iibs.resp.head.respMsg").toString();
            throw new ApiException(respCode, respMsg);
        }
    }

    /**
     * 调用总行公共服务平台的API
     *
     * @param transCode 接口交易码
     * @param reqBody   请求体的 iibs.req.body
     * @param reqHead   请求体的 iibs.req.head 非标准头或覆盖标准头
     * @return 响应报文
     */
    public String getCommonService(String transCode, Map<String, Object> reqBody, Map<String, Object> reqHead) {
        String url = environment.getProperty(KEY_PREFIX + "url");
        boolean hasUrl = environment.containsProperty(KEY_PREFIX + "code" + transCode);
        if (!hasUrl) {
            log.error("请先配置交易 {} 的请求路径", transCode);
            return null;
        }
        url += environment.getProperty(KEY_PREFIX + "code" + transCode);
        log.info("请求地址: {}", url);

        // 请求头
        String token = getToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("token", token);
        log.info("token: {}", token);
        // 请求体
        Map<String, Object> body = new HashMap<>();
        // 生成标准头，并用入参请求头覆盖
        Map<String, Object> stdHead = this.getReqHead(transCode);
        stdHead.putAll(reqHead);
        JSONPath.set(body, "$.iibs.req.head", stdHead);
        JSONPath.set(body, "$.iibs.req.body", reqBody);
        log.info("请求报文: {}", JSON.toJSONString(body));
        // 请求对象
        HttpEntity<Object> entity = new HttpEntity<>(body, headers);

        // 传递 transCode 记录请求日志
        ThreadLocalUtil.setTransCode(transCode);

        String result = restTemplate.postForObject(url, entity, String.class);
        log.info("响应报文: {}", result);
        return result;
    }

    /**
     * 调用总行公共服务平台的API
     *
     * @param transCode 接口交易码
     * @param reqBody   请求体的 iibs.req.body
     * @return 响应报文
     */
    public String getCommonService(String transCode, Map<String, Object> reqBody) {
        return this.getCommonService(transCode, reqBody, new HashMap<>());
    }

    private String getToken() {
        Object token = ConcurrentHashMapCache.get("token");

        if (token == null) {
            synchronized (this) {
                token = ConcurrentHashMapCache.get("token");
                if (token == null) {
                    token = doGetToken();
                    ConcurrentHashMapCache.put("token", token, ConcurrentHashMapCache.CACHE_HOLD_TIME_12H);
                }
            }
        }

        return (String) token;
    }

    private String doGetToken() {
        String tokenUrl = environment.getProperty(KEY_PREFIX + "token.url");
        String clientId = environment.getProperty(KEY_PREFIX + "token.clientId");
        String clientSecurity = environment.getProperty(KEY_PREFIX + "token.clientSecret");
        String auth = "Basic " + Base64.encodeBase64String((clientId + ":" + clientSecurity).getBytes());

        // 请求头
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.set("Authorization", auth);
        // 请求体
        String body = "grant_type=client_credentials";
        // 请求对象
        HttpEntity<String> entity = new HttpEntity<>(body, headers);

        String result = restTemplate.postForObject(tokenUrl, entity, String.class);
        String token = JSONPath.extract(result, "$.access_token").toString();
        log.info("重新获取token: {}", token);
        return token;
    }

    private Map<String, Object> getReqHead(String transCode) {
        // 系统编号
        String sysNo = environment.getProperty(KEY_PREFIX + "head.sysNo");
        // 应用标识
        String appId = environment.getProperty(KEY_PREFIX + "head.appId");
        // 当前时间
        String curTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

        Map<String, Object> head = new HashMap<>();
        // 顺序号 5位系统编码+2位保留域+8位系统日期（yyyyMMdd）+9位序号（3位应用标识+6位流水号）。
        head.put("orderNo", sysNo + "00" + curTime.substring(0, 8) + appId + curTime.substring(8, 14));
        // 发起方日期 yyyyMMdd
        head.put("reqTransdate", curTime.substring(0, 8));
        // 发起方时间 HHmmss
        head.put("reqTranstime", curTime.substring(8, 14));
        // 发起方流水号 分行自行定义（建议同顺序号），当天不重复即可
        head.put("reqSerial", head.get("orderNo"));
        // 应用标识 3位应用标识
        head.put("appId", appId);
        // 渠道标识
        head.put("channel", environment.getProperty(KEY_PREFIX + "head.channel")); // 华夏总行中间业务渠道
        // 交易代码
        head.put("transCode", transCode);
        // 产品代码
        head.put("productCode", environment.getProperty("prj.productCode"));
        // 交易机构 交易实际发生机构
        head.put("branch", environment.getProperty(KEY_PREFIX + "head.branch"));
        // 分行机构 交易机构所在一级分行机构码
        head.put("trsOrgan", environment.getProperty(KEY_PREFIX + "head.trsOrgan"));
        // 交易柜员 交易实际操作员
        head.put("teller", environment.getProperty(KEY_PREFIX + "head.teller"));
        // 版本号 值为具体接口交易中版本号的值
        head.put("version", environment.getProperty(KEY_PREFIX + "head.version"));

        return head;
    }
}
