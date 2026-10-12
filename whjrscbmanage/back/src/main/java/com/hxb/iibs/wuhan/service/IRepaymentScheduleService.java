package com.hxb.iibs.wuhan.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.hxb.iibs.wuhan.dto.InstallmentPlanItem;
import com.hxb.iibs.wuhan.entity.RepaymentSchedule;

import java.util.List;

/**
 * 还款计划明细 Service。
 */
public interface IRepaymentScheduleService extends IService<RepaymentSchedule> {

    /**
     * 全量替换某债券的还款明细（先软删旧计划，再插入新计划）。
     *
     * @param bondCode         债券编号
     * @param installmentItems 前端传来的结构化还款计划列表，可为 null 或空集合（表示清除）
     */
    void replaceByBondCode(String bondCode, List<InstallmentPlanItem> installmentItems);

    /**
     * 指定状态的全量替换某债券的还款明细。
     *
     * @param bondCode         债券编号
     * @param installmentItems 前端传来的结构化还款计划列表
     * @param status           状态：1=审批中，2=已生效
     */
    void replaceByBondCodeWithStatus(String bondCode,
                                      List<InstallmentPlanItem> installmentItems,
                                      Integer status);

    /**
     * 查询某债券的全部还款计划（不限状态），按期次 sort 升序。
     *
     * @param bondCode 债券编号
     * @return 该债券的所有还款计划明细
     */
    List<RepaymentSchedule> listByBondCode(String bondCode);

    /**
     * 按债券编号和状态查询还款计划。
     *
     * @param bondCode 债券编号
     * @param status   状态筛选，null 表示不限状态
     * @return 符合条件的还款计划明细
     */
    List<RepaymentSchedule> listByBondCodeWithStatus(String bondCode, Integer status);
}