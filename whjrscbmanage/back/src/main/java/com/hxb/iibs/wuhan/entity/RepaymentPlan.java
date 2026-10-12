package com.hxb.iibs.wuhan.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 还款计划子表
 */
@Getter
@Setter
@TableName("bus_repayment_plan")
public class RepaymentPlan implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long businessId;
    private LocalDate planDate;
    private BigDecimal repayAmount;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}