package com.hxb.iibs.wuhan.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.io.Serializable;
import java.math.BigDecimal;

/**
 * 上存利率配置更新 DTO。
 *
 * <p>用于管理员通过 PUT 接口修改全局税率配置。
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
public class UpperStorageConfigDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 票面利率，必填，正数，单位%（年化） */
    private BigDecimal couponRate;

    /** 增值税，必填，正数，单位% */
    private BigDecimal vat;

    /** 附加税，必填，正数，单位% */
    private BigDecimal surcharge;
}