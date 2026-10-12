package com.hxb.iibs.wuhan.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 单期还款计划 DTO。
 *
 * <p>前端正传来结构化 JSON 数组，本对象代表其中一期。
 * 由 Jackson 直接反序列化，无需手动解析。
 *
 * <p>支持两种字段名：
 * <ul>
 *   <li>{@code installmentTime} / {@code installmentAmount} — 新版前端字段名</li>
 *   <li>{@code planTime} / {@code amount} — 历史兼容字段名</li>
 * </ul>
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
public class InstallmentPlanItem implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 期次序号，从 1 开始（可不传，由程序自动生成） */
    private Integer sort;

    /** 还款金额，单位：元（新版本字段名） */
    @JsonAlias({"installmentAmount", "amount"})
    private BigDecimal amount;

    /** 还款时间，新版本字段名 */
    @JsonAlias({"installmentTime", "planTime"})
    private LocalDate planTime;
}