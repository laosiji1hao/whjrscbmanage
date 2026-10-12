package com.hxb.iibs.wuhan.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.io.Serializable;

/**
 * 226006 新增业务 / 226007 修改业务 共用 DTO。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Accessors(chain = true)
public class BondBusinessSaveDTO extends BondBusinessBaseDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    /** 发起角色："0"=客户经理，"1"=业务管理员，仅修改业务时使用 */
    private String updaterType;
}