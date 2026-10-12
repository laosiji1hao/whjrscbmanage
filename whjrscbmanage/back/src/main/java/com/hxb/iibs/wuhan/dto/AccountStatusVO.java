package com.hxb.iibs.wuhan.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.io.Serializable;

/**
 * 账户状态查询返回 VO。
 *
 * <p>封装 200115 账户状态查询的关键字段，降低泄漏面。
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
public class AccountStatusVO implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 账号（acctNo） */
    private String accountNo;

    /** 户名 */
    private String accountName;

    /** 客户号 */
    private String customerNo;

    /** 状态码，如 AS00 表示正常 */
    private String status;

    /** 状态文本，如 "正常" */
    private String statusTxt;

    /** 币种 */
    private String currency;

    /** 当前余额 */
    private String currentBalance;
}