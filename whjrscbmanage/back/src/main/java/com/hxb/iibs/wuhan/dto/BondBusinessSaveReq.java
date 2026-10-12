package com.hxb.iibs.wuhan.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * 债券业务新增/修改请求DTO，对应 i助手 req.body 字段
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
public class BondBusinessSaveReq implements Serializable {
    private static final long serialVersionUID = 1L;

    // === 基础标识 ===
    private String bondCode;          // 债券编号，内部唯一
    private String bondType;          // 标债/非标，0=标债，1=非标

    // === 客户信息 ===
    private String ecifCustomerNo;    // ECIF客户编号
    private String customerNo;        // 客户编号
    private String customerName;      // 融资人名称（授信主体）

    // === 业务基本信息 ===
    private String bizName;           // 项目/债券名称
    private String greenTechFlag;     // 绿色/科技/养老/不涉及，0~3
    private String bizType;           // 业务品种，整数编码 0~12

    // === 评级信息 ===
    private String extRating;         // 外部信用评级（主体）
    private LocalDate extRatingDate;  // 外部信用评级日期
    private String ratingAgency;      // 评级机构
    private String intRating;         // 内部评级
    private LocalDate intRatingDate;  // 内部评级日期

    // === 行业与客群（全为整数编码）===
    private String industry;          // 行业分类，0~3
    private String customerType;      // 客户分类，0~3
    private String alertCustomer;     // 是否我行预警客户，0=否，1=是

    // === 时间与金额（三元组）===
    private LocalDate startDate;     // 发放日/购买日
    private LocalDate matureDate;     // 到期日
    private String currency;          // 币种，默认 CNY
    private BigDecimal origAmount;    // 初始金额（原币）
    private BigDecimal rmbAmount;     // 初始金额（折人民币）
    private BigDecimal balance;        // 业务余额（折人民币），系统自动计算

    // === 利率 ===
    private BigDecimal investRate;    // 投资利率，单位%
    private BigDecimal transferRate;  // 价值转移利率，单位%
    private String guaranteeInfo;    // 担保情况，默认"信用"

    // === 风控字段（BOOL型统一 0/1）===
    private String breachFlag;        // 是否逾欠/违约，0=否，1=是
    private String fiveLevelClass;   // 五级分类
    private String fundUsedFlag;     // 是否涉及我行资金监管，0=否，1=是
    private String fundUsedUp;       // 我行监管资金是否已使用完毕，0=否，1=是

    // === 分期与承销 ===
    private String installmentFlag;  // 是否涉及分期还款，0=否，1=是
    private String ourBankUnderwrite;// 是否我行承销，0=否，1=是

    // === 组织与归属 ===
    private String manageLine;       // 所属管理条线，默认"金融市场部"
    private String dept;              // 对应处室（利率室/同业室）

    // === 资金用途与账户 ===
    private String agreedUsage;      // 约定资金用途
    private String fundAccount;      // 资金发放/募集账户账号
    private String superviseAccount; // 资金监管/回款专户账号
    // fundAccountFlag / superviseAccountFlag / supervisionFlag 由服务端根据账号非空自动推导，不从前端收

    // === 回表、行权、投后 ===
    private String isOriginalAm;     // 是否原资产管理部回表业务，0=否，1=是
    private String exerciseFlag;     // 是否行权，0=否，1=是
    private LocalDate exerciseDate;  // 行权日期
    private String remark;           // 批复管理要求
    private String jsRemark;          // 金融市场部批复管理要求
    // jsRemarkFlag 由服务端根据 jsRemark 非空自动推导，不从前端收

    private String inspectFreq;       // 实地检查频率，可选项：1/3/6
    private String inspectorPost;     // 投后检查实施人员岗位

    // === 经办人与机构 ===
    private String creator;           // 创建人OA
    private String orgCode;          // 创建人所在机构编码
    private String orgName;          // 创建人所在机构名称

    // === 还款计划 ===
    private List<RepaymentPlanItem> repaymentPlans = new ArrayList<>();

    @Data
    public static class RepaymentPlanItem implements Serializable {
        private static final long serialVersionUID = 1L;
        private LocalDate planDate;
        private BigDecimal repayAmount;
    }
}