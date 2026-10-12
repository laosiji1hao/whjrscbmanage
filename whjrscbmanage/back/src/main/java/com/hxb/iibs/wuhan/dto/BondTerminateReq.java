package com.hxb.iibs.wuhan.dto;

import lombok.Data;
import lombok.experimental.Accessors;

import java.io.Serializable;

/**
 * 债券业务中止请求DTO
 */
@Data
@Accessors(chain = true)
public class BondTerminateReq implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long businessId;
    private String terminator;
    private String reason;
}