package com.hxb.iibs.wuhan.api;

import com.alibaba.fastjson2.JSONObject;
import com.hxb.iibs.wuhan.anno.GxpApiAnno;

import java.util.Map;

/**
 * GXP接口调用<br/>
 * <ul><li>使用 @GxpApiAnno 定义请求路径和方法</li></ul>
 */
public interface IGxpApi {

    @GxpApiAnno(url = "/interfaceDsj/GjjHBDataServlet", method = "POST")
    JSONObject query(Map<String, Object> body);
}
