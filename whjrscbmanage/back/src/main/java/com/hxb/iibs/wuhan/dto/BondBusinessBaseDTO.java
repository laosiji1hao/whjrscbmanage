package com.hxb.iibs.wuhan.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

/**
 * 债券业务主表字段基类，四个接口共用。
 * 所有字段由 Jackson 通过 JsonStructureFilter 解包后的干净 JSON 自动反序列化，
 * 无需手动做 String→LocalDate / String→BigDecimal 等类型转换。
 */
@Data
@Accessors(chain = true)
public class BondBusinessBaseDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    /** 主键，新增时不填，修改/变更/中止时必填 */
    private String businessId;  // 业务唯一键(biz_uuid)，区别于自增id，operations 以它定位

    // --- 基本信息 ---
    /** 债券编号（必填，全局唯一） */
    private String bondCode;
    /** 债券类型，0=标债，1=非标 */
    private String bondType;
    /** ECIF 客户号 */
    private String ecifCustomerNo;
    /** 客户编号 */
    private String customerNo;
    /** 客户名称 */
    private String customerName;
    /** 业务/债券名称 */
    private String bizName;
    /** 绿色科技标识，0=绿色，1=科技，2=养老，3=不涉及 */
    private String greenTechFlag;
    /** 业务品种，整数编码 0~12 */
    private String bizType;

    // --- 评级信息 ---
    /** 外评等级 */
    private String extRating;
    /** 外评日期 */
    private LocalDate extRatingDate;
    /** 评级机构 */
    private String ratingAgency;
    /** 内评等级 */
    private String intRating;
    /** 内评日期 */
    private LocalDate intRatingDate;

    // --- 客户分类（全为整数编码）---
    /** 所属行业，0=货币金融服务，1=资本市场服务，2=保险业，3=其他金融业 */
    private String industry;
    /** 客户类型，0=一类，1=二类，2=三类，3=四类 */
    private String customerType;
    /** 预警客户标识，0=否，1=是 */
    private String alertCustomer;

    // --- 时间与金额（三元组）---
    /** 发放日/购买日 */
    private LocalDate startDate;
    /** 到期日 */
    private LocalDate matureDate;
    /** 币种，默认 CNY */
    private String currency;
    /** 初始金额（原币） */
    private BigDecimal origAmount;
    /** 初始金额（折人民币） */
    private BigDecimal rmbAmount;
    /** 业务余额（折人民币），系统自动计算 */
    private BigDecimal balance;

    // --- 金额利率 ---
    /** 投资利率 */
    private BigDecimal investRate;
    /** 转让利率 */
    private BigDecimal transferRate;

    // --- 风控与担保 ---
    /** 担保信息 */
    private String guaranteeInfo;
    /** 主承销商（226006 新增）*/
    private String leadUnderwriter;
    /** 违约标识，0=否，1=是 */
    private String breachFlag;
    /** 五级分类 */
    private String fiveLevelClass;
    /** 是否涉及我行资金监管，0=否，1=是 */
    private String fundUsedFlag;
    /** 资金使用完毕标志，0=否，1=是 */
    private String fundUsedUp;
    /** 分期标志，0=否，1=是 */
    private String installmentFlag;
    /**
     * 格式化还款计划文本，如"XXX日还款XX元"
     */
    private String installmentPlan;
    /**
     * 分期还款计划 - 还款日期列表（逗号分隔形如 2024-03-15,2024-06-15,...）
     * 【旧字段，已废弃，请使用 installmentItems 结构化数组】
     */
    @Deprecated
    private String instPlanDates;
    /**
     * 分期还款计划 - 还款金额列表（逗号分隔形如 50000.00,50000.00,...）
     * 【旧字段，已废弃，请使用 installmentItems 结构化数组】
     */
    @Deprecated
    private String instPlanAmounts;
    /**
     * 还款计划明细，前端传来可能有两种形式：
     * <ol>
     *   <li>直接的结构化数组：[{installmentTime, installmentAmount}, ...]</li>
     *   <li>嵌套的JSON字符串："[{\"installmentTime\":...}]"</li>
     * </ol>
     *
     * <p>Jackson 反序列化时会自动尝试，如果是字符串则原样存储；
     * 使用前调用 getInstallmentItems() 统一解析为 List。
     */
    private Object installment;

    public Object getInstallment() {
        return installment;
    }

    public void setInstallment(Object installment) {
        this.installment = installment;
    }

    /**
     * 获取还款计划列表，统一解析各种格式。
     *
     * @return 解析后的列表，永不为 null
     */
    @JsonIgnore
    public List<InstallmentPlanItem> getInstallmentItems() {
        if (installment == null) return Collections.emptyList();

        try {
            // 情况1：已经是 List（前端直接传数组）
            if (installment instanceof List<?> list) {
                @SuppressWarnings("unchecked")
                List<InstallmentPlanItem> result = (List<InstallmentPlanItem>) list;
                return result;
            }

            // 情况2：是字符串（嵌套的JSON字符串，如 "[{...}]"）
            if (installment instanceof String str) {
                if (str.trim().startsWith("[")) {
                    return com.alibaba.fastjson2.JSON.parseArray(str, InstallmentPlanItem.class);
                }
            }
        } catch (Exception e) {
            // 忽略解析异常，返回空列表
        }
        return Collections.emptyList();
    }
    /** 我行承销标志，0=否，1=是 */
    private String ourBankUnderwrite;

    // --- 管理归属 ---
    /** 管理路线，默认"金融市场部" */
    private String manageLine;
    /** 部门（利率室/同业室） */
    private String dept;
    /** 约定用途 */
    private String agreedUsage;
    /** 资金账户 */
    private String fundAccount;
    /** 监管账户 */
    private String superviseAccount;
    /** 是否原始资产管理人，0=否，1=是 */
    private String isOriginalAm;

    // --- 行使权 ---
    /** 行权标志，0=否，1=是 */
    private String exerciseFlag;
    /** 行权日期 */
    private LocalDate exerciseDate;

    // --- 其他 ---
    /** 支用检查情况，自由文本 */
    private String drawdownCheck;
    /** 备注 */
    private String remark;
    /** 批复号（2026-06-29 新增）*/
    private String remarkNumber;
    /** 是否有通道费，0=否，1=是（2026-06-29 新增）*/
    private String isPassage;
    /** 通道费金额，单位：元（2026-06-29 新增）*/
    private BigDecimal passageAmount;
    /** 上存利率，单位%，自动计算（226006 由定时任务覆盖，226007 可人工干预）（2026-06-29 新增）*/
    private BigDecimal upperStorageRate;
    /** 金融市场部批复管理要求 */
    private String jsRemark;
    /** 检视频率（1/3/6 月） */
    private String inspectFreq;
    /** 检视岗位 */
    private String inspectorPost;

    // --- 经办人 ---
    /** 经办人 OA 工号（前端字段名 operator） */
    private String operator;
    /** 经办人所在机构编码 */
    private String orgCode;
    /** 经办人所在机构名称 */
    private String orgName;

    // --- FLAG 字段（有值直接存，无值留空） ---
    /** 资金账户标记，0=否，1=是 */
    private String fundAccountFlag;
    /** 监管账户标记，0=否，1=是 */
    private String superviseAccountFlag;
    /** 批示管理要求标记，0=否，1=是 */
    private String jsRemarkFlag;
}