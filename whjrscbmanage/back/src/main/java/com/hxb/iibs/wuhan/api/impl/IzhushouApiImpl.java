package com.hxb.iibs.wuhan.api.impl;

import com.alibaba.fastjson2.JSON;
import com.hxb.iibs.wuhan.api.IIzhushouApi;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class IzhushouApiImpl implements IIzhushouApi {

    @Autowired
    private RestTemplate restTemplate;
    @Autowired
    private Environment environment;

    /**
     * 调用 i助手 插入数据的接口
     *
     * @param app             i助手 应用名
     * @param worksheetId     i助手 工作表
     * @param data            数据参数
     * @param triggerWorkflow 是否触发工作流
     * @return
     */
    @Override
    public String iHelperAddRow(String app, String worksheetId, Map<String, Object> data, boolean triggerWorkflow) {
        List<Map<String, Object>> controls = data.entrySet().stream().map(i -> {
            Map<String, Object> map = new HashMap<>();
            map.put("controlId", i.getKey());
            map.put("value", i.getValue());
            return map;
        }).collect(Collectors.toList());

        Map<String, Object> body = new HashMap<>();
        body.put("controls", controls);

        return this.iHelperAddRow(false, app, worksheetId, body, triggerWorkflow);
    }

    /**
     * 调用 i助手 插入多条数据的接口
     *
     * @param app             i助手 应用名
     * @param worksheetId     i助手 工作表
     * @param dataList        数据参数集合
     * @param triggerWorkflow 是否触发工作流
     * @return
     */
    @Override
    public String iHelperAddRows(String app, String worksheetId, List<Map<String, Object>> dataList, boolean triggerWorkflow) {
        List<List<Map<String, Object>>> rows = new ArrayList<>(dataList.size());
        for (Map<String, Object> data : dataList) {
            List<Map<String, Object>> controls = data.entrySet().stream().map(i -> {
                Map<String, Object> map = new HashMap<>();
                map.put("controlId", i.getKey());
                map.put("value", i.getValue());
                return map;
            }).collect(Collectors.toList());
            rows.add(controls);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("rows", rows);

        return this.iHelperAddRow(true, app, worksheetId, body, triggerWorkflow);
    }

    private String iHelperAddRow(boolean isAddRows, String app, String worksheetId, Map<String, Object> data, boolean triggerWorkflow) {
        String url = environment.getProperty(app + ".ihelper.addUrl") + (isAddRows ? "s" : "");
        String sign = environment.getProperty(app + ".ihelper.sign");
        String appKey = environment.getProperty(app + ".ihelper.appKey");

        // 请求头
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // 请求体
        Map<String, Object> body = new HashMap<>();
        body.put("appKey", appKey);
        body.put("sign", sign);
        body.put("worksheetId", worksheetId);
        body.put("triggerWorkflow", triggerWorkflow);
        body.putAll(data);
        log.info("------请求报文------\n" + JSON.toJSONString(body));
        // 请求对象
        HttpEntity<Object> entity = new HttpEntity<>(body, headers);

        String result = restTemplate.postForObject(url, entity, String.class);
        log.info("------响应报文------\n" + result);

        return JSON.parseObject(result).getString("data");
    }

    /**
     * 调用 i助手 编辑选项集
     *
     * @param app            i助手 应用名
     * @param collectionId   选项集 id
     * @param collectionName 选项集名
     * @param optionList     选项列表
     */
    @Override
    public void iHelperEditOptionSet(String app, String collectionId, String collectionName, List<String> optionList) {
        String url = environment.getProperty(app + ".ihelper.editOptionSetUrl") + collectionId;
        String sign = environment.getProperty(app + ".ihelper.sign");
        String appKey = environment.getProperty(app + ".ihelper.appKey");

        // 请求头
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // 请求体
        Map<String, Object> body = new HashMap<>();
        body.put("appKey", appKey);
        body.put("sign", sign);
        body.put("name", collectionName);
        body.put("colorful", false);
        body.put("enableScore", false);
        body.put("options", optionList.stream().map(ele -> {
            Map<String, Object> optionMap = new HashMap<>();
            optionMap.put("value", ele);
            return optionMap;
        }).collect(Collectors.toList()));
        log.info("------请求报文------\n" + JSON.toJSONString(body));
        // 请求对象
        HttpEntity<Object> entity = new HttpEntity<>(body, headers);

        restTemplate.postForObject(url, entity, String.class);
    }
}
