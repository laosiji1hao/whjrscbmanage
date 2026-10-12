package com.hxb.iibs.wuhan.entity;

import com.baomidou.mybatisplus.annotation.TableName;
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
@TableName("hxb_cpod_fhchar_product_serial")
public class HxbCpodFhcharProductSerial implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 平台日期
     */
    private String pltDate;

    /**
     * 平台时间
     */
    private String pltTime;

    /**
     * 平台流水号
     */
    private String pltSerial;

    /**
     * 报送渠道1-分行报送2-总行产品3-批量平台4-absSerial获取
     */
    private String channelCtrlFlag;

    /**
     * 分行机构号
     */
    private String branchCode;

    /**
     * 分行机构名称
     */
    private String branchName;

    /**
     * 渠道标识
     */
    private String channel;

    /**
     * 渠道标识名称
     */
    private String channelName;

    /**
     * 产品代码
     */
    private String productCode;

    /**
     * 产品名称
     */
    private String productName;

    /**
     * 业务编号
     */
    private String busiNo;

    /**
     * 业务名称
     */
    private String busiName;

    /**
     * 10001-预售房10002-ETC10003-非税10004-生活缴费10005-保证金10006-社保10007-查控类10008-代收付10009-财政支付10010-存量房10011-维修资金10012-其他资金监管10013-公积金100010-其他
     */
    private String busiTypeCode;

    /**
     * 业务大类名称
     */
    private String busiTypeName;

    /**
     * 账户类型0-个人1-对公
     */
    private String acctType;

    /**
     * 交易年    yyyy
     */
    private String busiYear;

    /**
     * 交易年月yyyyMM
     */
    private String billingMonth;

    /**
     * 交易日期yyyyMMdd
     */
    private String transDate;

    /**
     * 金融交易量
     */
    private Integer transCount;

    /**
     * 非金融交易量
     */
    private Integer transNum;

    /**
     * 交易金额
     */
    private BigDecimal transAmt;

    /**
     * 0: 其他，1: 客客互转，2: 内内互转，3: 客内互转
     */
    private String transType;

    /**
     * 沉淀资金金额
     */
    private BigDecimal collectionAmt;

    /**
     * C-贷D-借
     */
    private String cDFlag;

    /**
     * 是否是网贷、内管、创新孵化0: 其他，1-网贷，2-内管，3-创新孵化
     */
    private String ctrlFlag;

    /**
     * 租户id
     */
    private String groupName;

    /**
     * 投产日期
     */
    private String accptDate;

    /**
     * 项目投入金额
     */
    private BigDecimal voucherAmt;

    /**
     * 分行个性化字段
     */
    private String attachInfo1;

    /**
     * 扩展字段1
     */
    private String extField1;

    /**
     * 扩展字段2
     */
    private String extField2;

    /**
     * 扩展字段3
     */
    private String extField3;
}
