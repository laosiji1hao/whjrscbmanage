package com.hxb.iibs.wuhan.entity.ext;

import lombok.Data;

/**
 * i助手审批结果全量回传 VO — 替代 AssistedApprovalVO。
 *
 * <p>i助手在 226006 审批通过后，会返回完整的业务数据。
 * 我们用这些数据构建全新的 BondsBusiness 记录写入本地 DB。
 */
@Data
public class IAssistFullReturnVO {
    private Long ybid;
    private String approveStatus;  // "成功" / "失败"
    private String remark;

    // === 基本信息 ===
    private String bizUuid;             // 业务唯一键(UUID 32位无横线)，i助手回传或本地生成
    private String bondCode;
    private String bizName;
    private String customerNo;
    private String customerName;
    private String bondType;           // 中文，如"标债"，需解码为数字编码
    private String ecifCustomerNo;
    private String greenTechFlag;      // 中文，如"绿色"

    // === 评级信息 ===
    private String extRating;
    private String extRatingDate;
    private String ratingAgency;
    private String intRating;
    private String intRatingDate;

    // === 客户分类 ===
    private String industry;            // 中文，如"货币金融服务"
    private String customerType;        // 中文，如"一类"
    private String alertCustomer;       // 是/否

    // === 时间与金额 ===
    private String startDate;
    private String matureDate;
    private String currency;
    private String originAmount;
    private String initialAmount;       // i助手回的叫 initial_amount，对应我们的 rmbAmount
    private String balance;
    private String investRate;
    private String transferRate;

    // === 风控与担保 ===
    private String guaranteeInfo;       // 中文，如"信用"
    private String installmentFlag;     // 是/否
    private String ourBankUnderwrite;   // 是/否
    private String agreedUsage;
    private String installmentPlan;
    private String leadUnderwriter;
    private String fundAccountFlag;     // 是/否
    private String fundAccount;
    private String superviseAccountFlag; // 是/否
    private String superviseAccount;
    private String isOriginalAm;        // 是/否
    private String exerciseFlag;        // 是/否
    private String exerciseDate;

    // === 其他 ===
    private String remarkNumber;
    private String jsRemark;
    private String jsRemarkFlag;        // 是/否
    private String inspectFreq;
    private String inspectorPost;
    private String fiveLevelClass;
    private String breachFlag;          // 是/否
    private String fundUsedFlag;        // 是/否
    private String fundUsedUp;          // 是/否

    // === i助手特有字段 ===
    private String bizType;             // 业务品种
    private String dept;                 // 对应处室
    private String isPassage;            // 是否通道费
    private String passageAmount;         // 通道费金额

    // === 经办人（来自 i助手回传，非原始提交者）===
    private String handler;
    private String orgCode;
    private String orgName;
}