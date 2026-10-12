package com.hxb.iibs.wuhan.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.hxb.iibs.wuhan.entity.UpperStorageConfig;
import org.apache.ibatis.annotations.Mapper;

/**
 * 上存利率全局配置 Mapper，走默认 master 数据源。
 */
@Mapper
public interface UpperStorageConfigMapper extends BaseMapper<UpperStorageConfig> {
}