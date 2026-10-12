package com.hxb.iibs.wuhan.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.io.Serializable;

/**
 * 226008 变更客户经理专用 DTO。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Accessors(chain = true)
public class ManagerChangeDTO extends BondBusinessBaseDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    /** 新客户经理 OA 工号 */
    private String newCreator;

    /** 新客户经理所属机构编码 */
    private String newOrgCode;

    /** 新客户经理所属机构名称 */
    private String newOrgName;

    /**
     * 操作人类型。
     * "0" = 客户经理，"1" = 业务管理员
     */
    private String updaterType;
}