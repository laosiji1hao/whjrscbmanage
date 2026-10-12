package com.hxb.iibs.wuhan.dto;

import lombok.Data;
import lombok.experimental.Accessors;

import java.io.Serializable;

/**
 * 债券业务分页查询请求DTO
 */
@Data
@Accessors(chain = true)
public class BondBusinessQueryReq implements Serializable {
    private static final long serialVersionUID = 1L;

    private String bizName;
    private Integer status;
    private int pageNum = 1;
    private int pageSize = 10;
}