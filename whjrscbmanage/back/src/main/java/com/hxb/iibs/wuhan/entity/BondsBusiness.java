package com.hxb.iibs.wuhan.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 债券业务主表
 *
 * @see .claude/schemas/db/bond-business.sql
 */
@Getter
@Setter
@TableName("bus_bond_business")
public class BondsBusiness implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private String bizUuid;   // 业务唯一键(UUID 32位无横线)，区别于自增 id 与 bond_code

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
    private String currency;          // 币种
    private BigDecimal origAmount;    // 初始金额（原币）
    private BigDecimal rmbAmount;     // 初始金额（折人民币）
    private BigDecimal balance;       // 业务余额（折人民币），系统自动计算

    // === 利率 ===
    private BigDecimal investRate;    // 投资利率，单位%
    private BigDecimal transferRate;  // 价值转移利率，单位%

    // === 风控字段（BOOL型统一 0/1）===
    private String guaranteeInfo;    // 担保情况，默认"信用"
    private String breachFlag;        // 是否逾欠/违约，0=否，1=是
    private String fiveLevelClass;   // 五级分类
    private String fundUsedFlag;     // 是否涉及我行资金监管，0=否，1=是
    private String fundUsedUp;       // 我行监管资金是否已使用完毕，0=否，1=是

    // === 分期与承销 ===
    private String installmentFlag;  // 是否涉及分期还款，0=否，1=是
    private String installmentPlan;   // 格式化还款计划文本，如"XXX日还款XX元"【旧字段，推荐使用 instPlanDates + instPlanAmounts】
    private String instPlanDates;    // 分期还款日期列表，逗号分隔，形如 2024-03-15,2024-06-15
    private String instPlanAmounts;  // 分期还款金额列表，逗号分隔，与 dates 一一对应，单位：元
    private String ourBankUnderwrite;// 是否我行承销，0=否，1=是

    // === 主承销商（226006 新增）===
    private String leadUnderwriter;  // 主承销商/联席主承销商

    // === 组织与归属 ===
    private String manageLine;       // 所属管理条线，默认"金融市场部"
    private String dept;             // 对应处室（利率室/同业室）

    // === 资金用途与账户 ===
    private String agreedUsage;      // 约定资金用途
    private String fundAccount;      // 资金发放/募集账户账号
    private String fundAccountFlag;  // 是否有资金发放账户，0=否，1=是，由 fundAccount 非空自动推导
    private String superviseAccount; // 资金监管/回款专户账号
    private String superviseAccountFlag; // 是否有资金监管账户，0=否，1=是，由 superviseAccount 非空自动推导
    private String supervisionFlag;   // 是否涉及资金监管，0=否，1=是，同等于 supervise_account_flag（2026-06-29 新增联动）

    private String drawdownCheck;    // 支用检查情况，自由文本

    // === 回表、行权、投后 ===
    private String isOriginalAm;     // 是否原资产管理部回表业务，0=否，1=是
    private String exerciseFlag;     // 是否行权，0=否，1=是
    private LocalDate exerciseDate;  // 行权日期，届时触发企微提醒
    private String remark;           // 批复管理要求
    private String remarkNumber;      // 批复号（2026-06-29 新增）
    private String isPassage;        // 是否有通道费，0=否，1=是（2026-06-29 新增）
    private BigDecimal passageAmount;   // 通道费金额，单位：元（2026-06-29 新增）
    private BigDecimal upperStorageRate;  // 上存利率，单位%，自动计算（2026-06-29 新增）
    private String jsRemark;         // 金融市场部批复管理要求
    private String jsRemarkFlag;     // 是否存在金融市场部批复管理要求，0=否，1=是，由 jsRemark 非空自动推导
    private String inspectFreq;      // 实地检查频率，可选项：1/3/6
    private String inspectorPost;     // 投后检查实施人员岗位

    // === 经办人与机构 ===
    private String creator;           // 创建人OA
    private String orgCode;          // 创建人所在机构编码
    private String orgName;          // 创建人所在机构名称

    // === 申请表编号（226009 新增）===
    private String applyNo;          // 申请表编号，来自 rmb_credit_bond_declaration.apply_no

    // === 业务状态（五态机）===
    private Integer status;                          // 0=未完善，1=审核中，2=审核失败，3=生效中，4=已过期，5=已中止
    private String terminationReason;                // 中止原因，仅在 status=5 时有意义

    // === 时间戳 ===
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private String exerciseReminderSent; // 行权提醒是否已发送，0=未发，1=已发
}