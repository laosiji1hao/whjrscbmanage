package com.hxb.iibs.wuhan.api;

import com.alibaba.fastjson2.JSONObject;
import com.hxb.iibs.wuhan.anno.DataFactoryApiAnno;

import java.util.Map;

/**
 * 数据工厂接口调用。<br/>
 * 使用 @DataFactoryApiAnno 定义网关路径。
 */
public interface IDataFactoryApi {

    /**
     * cms_no_td_info 债券账号查询。
     * POST /api/gateway/cms_no_td_info
     * Header: api-token
     * Body: { "inFields": { "cb_host_no": "..." } }
     *
     * @param body 请求体（外层 inFields 由 Proxy 自动包装）
     * @return 完整响应 JSON，形如：
     *         { data: [{ no_td: "C200914", cb_host_no: "00000000003426140" }],
     *           success: true, ... }
     */
    @DataFactoryApiAnno(path = "/api/gateway/cms_no_td_info")
    JSONObject queryNoTdInfo(Map<String, Object> body);
}