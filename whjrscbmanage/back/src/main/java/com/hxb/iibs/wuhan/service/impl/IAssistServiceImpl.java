package com.hxb.iibs.wuhan.service.impl;

import com.alibaba.fastjson2.JSON;
import com.hxb.iibs.wuhan.entity.FlowData;
import com.hxb.iibs.wuhan.entity.ITfHelperMain;
import com.hxb.iibs.wuhan.enums.Constant;
import com.hxb.iibs.wuhan.exception.ApiException;
import com.hxb.iibs.wuhan.exception.BusiException;
import com.hxb.iibs.wuhan.service.IFlowDataService;
import com.hxb.iibs.wuhan.service.IIAssistService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;

/**
 * i助手发送服务实现：四步调用链
 * <ol>
 *   <li>检查同一 bond_code 是否已有 pending 状态的审批记录，有则拒尽</li>
 *   <li>入库 iassist_flow_data，得自增主键 ybid</li>
 *   <li>main.addDataItem("ybid", ybid)</li>
 *   <li>若 iassist.enabled=true：RestTemplate POST 到 iassist.url；否则跳过（测试用）</li>
 * </ol>
 */
@Slf4j
@Service
public class IAssistServiceImpl implements IIAssistService {

    @Autowired
    private IFlowDataService flowDataService;
    @Autowired
    private RestTemplate restTemplate;

    @Value("${iassist.enabled:true}")
    private boolean iassistEnabled;

    @Value("${iassist.url:http://125.160.1.146:6160/fineReportDev/transferRequestDataWithMultiSubTableRows}")
    private String iassistUrl;

    /**
     * 向 i助手发送审批请求，三步调用链：
     * <ol>
     *   <li>写入 iassist_flow_data 审计表，获取自增主键 ybid</li>
     *   <li>main.addDataItem("ybid", ybid)，供移动端跳转使用</li>
     *   <li>RestTemplate POST 到 iassist.url，触发审批流</li>
     * </ol>
     *
     * @param main     已构建好的业务数据消息体，所有字段已由 {@link com.hxb.iibs.wuhan.service.impl.BondsBusinessServiceImpl} 填充完毕
     * @param flowCode i助手流程编号，决定走哪个审批模板（如 "flow_001"、"flow_002"）
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void sendIAssist(ITfHelperMain main, String flowCode) {
        // 身份=biz_uuid：审批流按 biz_uuid 关联（bond_code 可重复，不可再作为唯一关联）
        String bizUuid = main.getData().stream()
                .filter(m -> "biz_uuid".equals(m.get("fieldName")))
                .map(m -> String.valueOf(m.get("value")))
                .filter(v -> !v.isEmpty())
                .findFirst()
                .orElse("");
        String bondCode = main.getData().stream()
                .filter(m -> "bond_code".equals(m.get("fieldName")))
                .map(m -> String.valueOf(m.get("value")))
                .findFirst()
                .orElse("");
        // 兼容存量流（迁移前 business_no 存的是 bond_code）：biz_uuid 缺失时退用 bond_code
        String businessNo = !bizUuid.isEmpty() ? bizUuid : bondCode;

        // Step 1: 检查是否已有进行中的审批流程，同一 biz_uuid 不能重复送审
        boolean pendingExists = flowDataService.lambdaQuery()
                .eq(FlowData::getBusinessNo, businessNo)
                .eq(FlowData::getApprovalStatus, Constant.ApprovalStatus.PENDING)
                .exists();
        if (pendingExists) {
            throw new BusiException("该业务已有正在审批中的流程，请勿重复提交");
        }

        // Step 2: 写审计日志，获取 ybid
        FlowData auditRecord = new FlowData();
        auditRecord.setBusinessNo(businessNo);
        auditRecord.setApplicantOa(main.getOperatePersonnel());
        auditRecord.setFlowCode(flowCode);
        auditRecord.setData(JSON.toJSONString(main));
        auditRecord.setApprovalStatus(0); // 待审批
        auditRecord.setCreateTime(LocalDateTime.now());
        auditRecord.setUpdateTime(LocalDateTime.now());
        flowDataService.saveAndGetId(auditRecord);
        Long ybid = auditRecord.getId();

        // Step 3: 将 record-id 加入主表 data 区，供移动端跳转
        // 先移除可能存在的空 ybid 占位符（如 sendIAssist226007 中预设的空值）
        main.getData().removeIf(m -> "ybid".equals(m.get("fieldName")));
        main.addDataItem("ybid", String.valueOf(ybid));

        if (!iassistEnabled) {
            log.info("i助手已禁用（iassist.enabled=false），仅写入审计表，HTTP 调用跳过");
            return;
        }

        // Step 4: HTTP 发送到 i助手
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String jsonBody = JSON.toJSONString(main);
        log.info("i助手请求报文: {}", jsonBody);

        HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);
        String response = restTemplate.postForObject(iassistUrl, entity, String.class);
        log.info("i助手响应报文: {}", response);

        // 校验响应中 data 字段是否为空
        if (response == null || response.isEmpty()) {
            throw new ApiException("IASSIST_EMPTY_RESP", "i助手返回空响应");
        }
        // 简单判断：若含 "data":"" 或缺少 data 字段则告警（具体格式待第二批联调确认）
        if (response.contains("\"data\":\"\"") || !response.contains("\"data\"")) {
            log.warn("i助手响应 data 字段可能为空，请关注: {}", response);
        }
    }
}