package com.hxb.iibs.wuhan.entity.ext;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 226007 专用 VO——字段与 BondsBusiness 一致，外加 ybid / approveStatus / remark。
 * BeanUtils.copyProperties 时 exclude：id / createTime / updateTime / status / exerciseReminderSent。
 */
@Data
public class AssistedUpdateVO {
    // ---- PK & 公共审批字段 ----
    private Long ybid;
    private String approveStatus;   // "成功" / "失败"
    private String remark;          // 批复管理要求

    // 【本次改造】226007 现在只传9个固定字段，其中 update_context 是变更轨迹字符串
    /** 变更轨迹，形如 "ecif客户号由AAA变为BBB;客户编号由CCC变为DDD" */
    private String updateContext;

    // ---- 基础标识 ----
    private String bondCode;
    private String bondType;
    private String ecifCustomerNo;
    private String customerNo;
    private String customerName;
    private String bizName;
    private String bizType;
    private String greenTechFlag;

    // ---- 评级信息 ----
    private String extRating;
    private LocalDate extRatingDate;
    private String ratingAgency;
    private String intRating;
    private LocalDate intRatingDate;

    // ---- 行业与客群 ----
    private String industry;
    private String customerType;
    private String alertCustomer;

    // ---- 时间与金额 ----
    private LocalDate startDate;
    private LocalDate matureDate;
    private String currency;
    private BigDecimal rmbAmount;
    private BigDecimal balance;

    // ---- 利率与担保 ----
    private BigDecimal investRate;
    private BigDecimal transferRate;
    private String guaranteeInfo;
    /** 主承销商（226006 新增） */
    private String leadUnderwriter;

    // ---- 风控 ----
    private String breachFlag;
    private String fiveLevelClass;
    private String fundUsedFlag;
    private String fundUsedUp;

    // ---- 分期与承销 ----
    private String installmentFlag;
    private String installmentPlan;
    private String instPlanDates;
    private String instPlanAmounts;
    private String ourBankUnderwrite;

    // ---- 组织与归属 ----
    private String manageLine;
    private String dept;

    // ---- 资金用途与账户 ----
    private String agreedUsage;
    private String fundAccount;
    private String superviseAccount;
    private String drawdownCheck;

    // ---- 回表、行权、投后 ----
    private String isOriginalAm;
    private String exerciseFlag;
    private LocalDate exerciseDate;
    private String jsRemark;
    private String inspectFreq;
    private String inspectorPost;

    // ---- 经办人与机构 ----
    private String creator;
    private String orgCode;
    private String orgName;
}