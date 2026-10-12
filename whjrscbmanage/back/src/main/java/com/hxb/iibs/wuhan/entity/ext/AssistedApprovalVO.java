package com.hxb.iibs.wuhan.entity.ext;

import lombok.Data;

import java.math.BigDecimal;

/**
 * i助手审批结果同步 — 226006 最简视图。
 *
 * <p>【本次改造】i助手会在 226006 通过后回传4个额外字段用于自动计算上存利率。
 */
@Data
public class AssistedApprovalVO {
    private Long ybid;
    private String bondCode;
    private String approveStatus;   // "成功" / "失败"
    private String remark;

    // 【本次新增】i助手回传的4个字段
    /** 业务品种（用于记录留存） */
    private String bizType;
    /** 对应处室（用于记录留存） */
    private String dept;
    /** 是否有通道费，"是" 或 "1" 表示有 */
    private String isPassage;
    /** 通道费金额，单位：元 */
    private BigDecimal passageAmount;
}