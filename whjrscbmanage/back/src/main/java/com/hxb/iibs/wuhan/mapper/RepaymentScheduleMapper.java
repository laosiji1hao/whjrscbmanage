package com.hxb.iibs.wuhan.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.hxb.iibs.wuhan.entity.RepaymentSchedule;
import org.apache.ibatis.annotations.Mapper;

/**
 * 还款计划明细 Mapper，走默认 master 数据源。
 */
@Mapper
public interface RepaymentScheduleMapper extends BaseMapper<RepaymentSchedule> {
}