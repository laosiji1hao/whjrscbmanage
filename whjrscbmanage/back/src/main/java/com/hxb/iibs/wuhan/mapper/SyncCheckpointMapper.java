package com.hxb.iibs.wuhan.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.hxb.iibs.wuhan.entity.SyncCheckpoint;
import org.apache.ibatis.annotations.Mapper;

/**
 * 定时任务同步断点 Mapper，走默认 master 数据源。
 */
@Mapper
public interface SyncCheckpointMapper extends BaseMapper<SyncCheckpoint> {
}