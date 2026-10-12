package com.hxb.iibs.wuhan.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * i助手审批记录数据表
 */
@Getter
@Setter
@TableName("iassist_flow_data")
public class FlowData implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;

    private String businessNo;
    private String applicantOa;
    private String flowCode;
    private String data;
    private Integer approvalStatus;
    private String resultComment;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}