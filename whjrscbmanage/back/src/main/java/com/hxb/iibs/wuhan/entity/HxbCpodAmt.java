package com.hxb.iibs.wuhan.entity;

import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;

/**
 * <p>
 *
 * </p>
 *
 * @author baomidou
 * @since 2025-05-29
 */
@Getter
@Setter
public class HxbCpodAmt implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 账户类型: 0-个人，1-对公
     */
    private String acctType = "";

    /**
     * 交易金额
     */
    private BigDecimal transAmt = BigDecimal.ZERO;

    /**
     * 0: 其他，1: 客客互转，2: 内内互转，3: 客内互转
     */
    private String transType = "";

    /**
     * 沉淀资金金额
     */
    private BigDecimal collectionAmt = BigDecimal.ZERO;

    /**
     * C-贷D-借
     */
    private String cDFlag = "";
}
