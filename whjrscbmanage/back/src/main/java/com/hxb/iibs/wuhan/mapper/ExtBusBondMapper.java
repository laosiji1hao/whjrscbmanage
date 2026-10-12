package com.hxb.iibs.wuhan.mapper;

import com.baomidou.dynamic.datasource.annotation.DS;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.hxb.iibs.wuhan.entity.ext.ExtBusBond;
import org.apache.ibatis.annotations.Mapper;

/**
 * 业务申报表 Mapper，数据源指向 busiMobile。
 *
 * @see #bondSync bondSync 定时任务使用
 */
@Mapper
@DS("busiMobile")
public interface ExtBusBondMapper extends BaseMapper<ExtBusBond> {
}