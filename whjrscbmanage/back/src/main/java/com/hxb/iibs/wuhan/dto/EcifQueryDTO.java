package com.hxb.iibs.wuhan.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

/**
 * 根据 ECIF 客户号查询客户信息的请求体。
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
public class EcifQueryDTO {

    /** 客户编号（必填） */
    private String custNo;
}