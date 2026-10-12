package com.hxb.iibs.wuhan.entity;

import lombok.Data;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 此类因为移动组接口的变化，与以前的不同，所以使用新的接口进行处理
 */
@Data
public class ITfHelperMain {
    /**
     * 表名称
     */
    private String tabName;

    /**
     * 请求序号
     */
    private String reqNo;

    /**
     * 数据库模式名称
     */
    private String dstSchema;

    /**
     * 是否触发工作流
     */
    private String triggerWorkflow;

    /**
     * 项目ID
     */
    private String projectId;

    /**
     * 操作方式
     */
    private String operateType;

    /**
     * 主表数据
     */
    private List<Map<String,Object>> data;


    /**
     * 操作人OA
     */
    private String operatePersonnel;

    public ITfHelperMain() {
        this.data = new ArrayList<>();
    }

    public void addDataItem(String fieldName, String value) {
        Map<String, Object> item = new HashMap<>();
        item.put("fieldName", fieldName);
        item.put("value", value);
        data.add(item);
    }
}
