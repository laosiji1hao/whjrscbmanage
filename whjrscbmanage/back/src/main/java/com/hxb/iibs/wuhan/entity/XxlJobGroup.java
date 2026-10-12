package com.hxb.iibs.wuhan.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

/**
 * <p>
 * 
 * </p>
 *
 * @author baomidou
 * @since 2025-06-25
 */
@Getter
@Setter
@TableName("xxl_job_group")
public class XxlJobGroup implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    /**
     * 执行器AppName
     */
    private String appName;

    /**
     * 执行器名称
     */
    private String title;

    /**
     * 执行器地址类型：0=自动注册、1=手动录入
     */
    private Byte addressType;

    /**
     * 执行器地址列表，多地址逗号分隔
     */
    private String addressList;

    private LocalDateTime updateTime;
}
