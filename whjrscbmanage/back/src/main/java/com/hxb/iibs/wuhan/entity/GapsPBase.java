package com.hxb.iibs.wuhan.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

/**
 * <p>
 *
 * </p>
 *
 * @author baomidou
 * @since 2025-06-25
 */
@Getter
@Setter
@TableName("gaps_p_base")
public class GapsPBase implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 编号
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    /**
     * 项目ID（英文名）
     */
    private String projectId;

    /**
     * 项目名称（中文名）
     */
    private String projectName;

    /**
     * 系统编号（it服务平台生成）
     */
    private String sysNo;

    /**
     * FR编号
     */
    private String frCode;

    /**
     * 产品代码
     */
    private String productCode;

    /**
     * 项目环境
     */
    private String projectEnvironment;

    /**
     * GAPS端口号
     */
    private String gapsPort;

    /**
     * GXP端口号
     */
    private String gxpPort;

    /**
     * 1-开发中，2-已完成，3-待审核，4-已审核
     */
    private String status;

    /**
     * 项目投产日期
     */
    private String onlineDate;

    /**
     * 说明
     */
    private String remark;

    /**
     * 已同步hash，关联已同步流程列表
     */
    private String hashSync;

    /**
     * 审核hash，关联待、已审核流程列表
     */
    private String hashCheck;

    private String createTime;

    private String creator;

    private String updateTime;

    private String modifier;

    /**
     * 业务大类编号: 10001-预售房，10002-ETC，10003-非税，10004-生活缴费，10005-保证金，10006-社保，10007-查控类，10008-代收付，10009-财政支付，10010-存量房，10011-维修资金，10012-其他资金监管，10013-公积金，100010-其他
     */
    private String busiTypeCode;

    /**
     * 业务大类名称
     */
    private String busiTypeName;

    /**
     * 是否是网贷、内管、创新孵化: 0-其他，1-网贷，2-内管，3-创新孵化
     */
    private String ctrlFlag;

    /**
     * 项目投入金额
     */
    private BigDecimal voucherAmt;
}
