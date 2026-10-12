package com.hxb.iibs.wuhan.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hxb.iibs.wuhan.dto.InstallmentPlanItem;
import com.hxb.iibs.wuhan.entity.RepaymentSchedule;
import com.hxb.iibs.wuhan.enums.Constant;
import com.hxb.iibs.wuhan.mapper.RepaymentScheduleMapper;
import com.hxb.iibs.wuhan.service.IRepaymentScheduleService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 还款计划明细 Service 实现。
 */
@Slf4j
@Service
public class RepaymentScheduleServiceImpl
        extends ServiceImpl<RepaymentScheduleMapper, RepaymentSchedule>
        implements IRepaymentScheduleService {

    @Override
    public void replaceByBondCode(String bondCode, List<InstallmentPlanItem> installmentItems) {
        replaceByBondCodeWithStatus(bondCode, installmentItems, Constant.RepaymentStatus.AUDITING);
    }

    /**
     * 指定状态的全量替换某债券的还款明细（先删后插）。
     *
     * @param bondCode         债券编号
     * @param installmentItems 前端传来的结构化还款计划列表，可为 null 或空集合（表示清除）
     * @param status           状态：1=审批中，2=已生效
     */
    @Override
    public void replaceByBondCodeWithStatus(String bondCode,
                                             List<InstallmentPlanItem> installmentItems,
                                             Integer status) {
        // 1. 将旧计划标记为已失效（不删除，保留历史记录）
        lambdaUpdate()
                .eq(RepaymentSchedule::getBondCode, bondCode)
                .ne(RepaymentSchedule::getStatus, Constant.RepaymentStatus.INVALID)
                .set(RepaymentSchedule::getStatus, Constant.RepaymentStatus.INVALID)
                .set(RepaymentSchedule::getUpdateTime, LocalDateTime.now())
                .update();

        // 2. 空列表则结束
        if (installmentItems == null || installmentItems.isEmpty()) {
            return;
        }

        // 3. 过滤无效期次，自动生成 sort，逐条插入新计划
        AtomicInteger sortCounter = new AtomicInteger(0);
        List<RepaymentSchedule> schedules = installmentItems.stream()
                .filter(it -> it.getPlanTime() != null && it.getAmount() != null)
                .map(it -> {
                    RepaymentSchedule r = new RepaymentSchedule();
                    r.setBondCode(bondCode);
                    // 如果前端没传 sort，则按数组顺序自动生成（第1期、第2期...）
                    r.setSort(it.getSort() != null ? it.getSort() : sortCounter.incrementAndGet());
                    r.setRepaymentDate(it.getPlanTime());
                    r.setRepaymentAmount(it.getAmount());
                    r.setStatus(status != null ? status : Constant.RepaymentStatus.AUDITING);
                    r.setCreateTime(LocalDateTime.now());
                    r.setUpdateTime(LocalDateTime.now());
                    return r;
                })
                .toList();

        saveBatch(schedules);
        log.info("[replaceByBondCodeWithStatus] bondCode={}, 新增{}期还款计划, status={}",
                bondCode, schedules.size(), status);
    }

    @Override
    public List<RepaymentSchedule> listByBondCode(String bondCode) {
        return listByBondCodeWithStatus(bondCode, null);
    }

    /**
     * 按债券编号和状态查询还款计划。
     *
     * @param bondCode 债券编号
     * @param status   状态筛选，null 表示不限状态
     * @return 符合条件的还款计划明细
     */
    @Override
    public List<RepaymentSchedule> listByBondCodeWithStatus(String bondCode, Integer status) {
        var query = lambdaQuery()
                .eq(RepaymentSchedule::getBondCode, bondCode)
                .orderByAsc(RepaymentSchedule::getSort);

        if (status != null) {
            query.eq(RepaymentSchedule::getStatus, status);
        }

        return query.list();
    }
}