package com.hxb.iibs.wuhan.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 定时任务同步断点记录表。
 *
 * @see .claude/schemas/db/bond-business.sql
 */
@Data
@TableName("bus_sync_checkpoint")
public class SyncCheckpoint {

    /** 任务名，主键（String 类型，非数字序列） */
    @TableId
    private String taskName;

    /** 最后一次同步的外部表最大 id */
    private Long lastId;

    /** 更新时间 */
    private LocalDateTime updateTime;
}