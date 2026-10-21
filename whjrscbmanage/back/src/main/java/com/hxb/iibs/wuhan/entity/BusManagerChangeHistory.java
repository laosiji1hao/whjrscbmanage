package com.hxb.iibs.wuhan.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 客户经理变更历史记录表（226008 专用）
 *
 * @see .claude/schemas/db/manager-change-history.sql
 */
@Getter
@Setter
@TableName("bus_manager_change_history")
public class BusManagerChangeHistory implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 关联业务唯一键 biz_uuid */
    private String businessId;

    /** 原经办人 OA */
    private String oldHandler;
    /** 原经办人所在机构编码 */
    private String oldOrgCode;
    /** 原经办人所在机构名称 */
    private String oldOrgName;

    /** 新经办人 OA */
    private String newHandler;
    /** 新经办人所在机构编码 */
    private String newOrgCode;
    /** 新经办人所在机构名称 */
    private String newOrgName;

    /** 变更原因（可选） */
    private String changeReason;

    /** 申请人 OA（本轮操作发起方） */
    private String applicantOa;

    /** 创建时间 */
    private LocalDateTime createTime;
}