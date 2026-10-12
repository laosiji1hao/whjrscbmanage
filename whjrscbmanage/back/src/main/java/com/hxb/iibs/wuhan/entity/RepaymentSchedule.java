package com.hxb.iibs.wuhan.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 还款计划明细表。
 *
 * <p>一笔债券对应多期还款，一对多关系。当 installmentFlag='1' 时，
 * 前端传入结构化 JSON 数组，按期逐条存入本表。
 *
 * @see .claude/schemas/db/bond-business.sql
 */
@Data
@TableName("bus_repayment_schedule")
public class RepaymentSchedule implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 主键，自增 */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 债券编号，关联 bus_bond_business.bond_code */
    private String bondCode;

    /** 期次序号，从 1 开始 */
    private Integer sort;

    /** 还款时间 */
    private LocalDate repaymentDate;

    /** 还款金额，单位：元 */
    private BigDecimal repaymentAmount;

    /** 创建时间 */
    private LocalDateTime createTime;

    /** 更新时间 */
    private LocalDateTime updateTime;

    /** 状态：0=已失效，1=审批中，2=已生效 */
    private Integer status;
}