package com.hxb.iibs.wuhan.api;

import java.util.List;
import java.util.Map;

/**
 * i助手平台接口调用（待测试）
 */
public interface IIzhushouApi {

    /**
     * 调用 i助手 插入数据的接口
     *
     * @param app             i助手 应用名
     * @param worksheetId     i助手 工作表
     * @param data            数据参数
     * @param triggerWorkflow 是否触发工作流
     * @return 新增记录的 rowId
     */
    String iHelperAddRow(String app, String worksheetId, Map<String, Object> data, boolean triggerWorkflow);

    /**
     * 调用 i助手 插入多条数据的接口
     *
     * @param app             i助手 应用名
     * @param worksheetId     i助手 工作表
     * @param dataList        数据参数集合
     * @param triggerWorkflow 是否触发工作流
     * @return 新增记录的总数量
     */
    String iHelperAddRows(String app, String worksheetId, List<Map<String, Object>> dataList, boolean triggerWorkflow);

    /**
     * 调用 i助手 编辑选项集
     *
     * @param app            i助手 应用名
     * @param collectionId   选项集 id
     * @param collectionName 选项集名
     * @param optionList     选项列表
     * @return
     */
    void iHelperEditOptionSet(String app, String collectionId, String collectionName, List<String> optionList);
}
