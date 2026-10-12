package com.hxb.iibs.wuhan.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 上存利率全局配置表。
 *
 * <p>存储 coupon_rate / vat / surcharge 三个全局税率，供所有业务共用。
 * 计算公式：upper_storage_rate = coupon_rate - vat - surcharge - passage_amount
 *
 * @see .claude/schemas/db/bond-business.sql
 */
@Data
@TableName("bus_upper_storage_config")
public class UpperStorageConfig implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 主键，自增 */
    @TableId(type = IdType.AUTO)
    private Integer id;

    /** 配置键，目前固定 GLOBAL */
    private String configKey;

    /** 票面利率，单位%（年化），如 3.650000 */
    private BigDecimal couponRate;

    /** 增值税，单位%，如 0.060000 */
    private BigDecimal vat;

    /** 附加税，单位%，如 0.012000 */
    private BigDecimal surcharge;

    /** 最后修改人OA */
    private String updater;

    /** 最后修改时间 */
    private LocalDateTime updateTime;
}