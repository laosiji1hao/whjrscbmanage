package com.hxb.iibs.wuhan.entity.ext;

import lombok.Data;

/**
 * i助手中止业务审批结果视图（226009）。
 *
 * <p>从 busiMobile 库的 terminate_business 表拉取，用于驱动本地业务状态机。
 */
@Data
public class TerminateApprovalVO {

    /** 审批流水号，来自 iassist_flow_data */
    private Long ybid;

    /** 债券编号 */
    private String bondCode;

    /** 审批结果，"成功" 或 "失败" */
    private String approveStatus;
}