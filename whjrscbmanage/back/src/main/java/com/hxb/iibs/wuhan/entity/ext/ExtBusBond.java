package com.hxb.iibs.wuhan.entity.ext;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 人民币信贷类债券申报登记台账（busi_mobile 库）— bondSync 同步源。
 * 外部表字段名与业务主表字段名一致，无需额外映射。
 *
 * @see plan-20260624-bond-sync-apply-no-diff
 */
@Data
@TableName("rmb_credit_bond_declaration")
public class ExtBusBond {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 项目名称 */
    private String bizName;

    /** 客户名称 */
    private String customerName;

    /** 主承销商/联席主承销商 */
    private String leadUnderwriter;

    /** 担保情况 */
    private String guaranteeInfo;

    /** 约定资金用途 */
    private String agreedUsage;

    /** 内部评级 */
    private String intRating;

    /** 内部评级日期 */
    private String intRatingDate;

    /** 客户分类 */
    private String customerType;

    /** 申请人OA */
    private String applyOper;

    /** 申请表编号，用于关联业务主表【226009 新增】 */
    private String applyNo;

    /** 审批状态：成功/失败/空 */
    private String approveStatus;

}