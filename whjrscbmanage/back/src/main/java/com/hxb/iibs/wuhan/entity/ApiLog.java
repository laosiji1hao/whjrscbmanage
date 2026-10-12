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
 * 接口调用日志表
 * </p>
 *
 * @author baomidou
 * @since 2025-06-10
 */
@Getter
@Setter
@TableName("api_log")
public class ApiLog implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 自增id
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    /**
     * 项目ID（英文名）
     */
    private String projectId;

    /**
     * 项目名称（中文名）
     */
    private String projectName;

    /**
     * 产品代码
     */
    private String productCode;

    /**
     * 流程编号
     */
    private String flowCode;

    /**
     * 交易码
     */
    private String transCode;

    /**
     * 请求路径
     */
    private String requestPath;

    /**
     * 请求时间
     */
    private LocalDateTime requestTime;
}
