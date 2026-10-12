package com.hxb.iibs.wuhan.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.io.Serializable;

/**
 * 226009 中止业务专用 DTO。
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
public class TerminateDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    /** 债券编号（必填，用于定位业务记录） */
    private String bondCode;

    /** 业务唯一键(biz_uuid)，优先用它定位（区别于自增id与可改的bondCode） */
    private String businessId;

    /** 操作人 OA 工号 */
    private String terminator;

    /** 变更人类型："0"=客户经理，"1"=业务管理员 */
    private String updaterType;
}