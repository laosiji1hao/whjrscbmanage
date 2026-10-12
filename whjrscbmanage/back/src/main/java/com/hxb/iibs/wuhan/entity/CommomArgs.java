package com.hxb.iibs.wuhan.entity;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

/**
 * 公共参数<br>
 * operator、flowId、pageNo、pageSize
 *
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
public class CommomArgs {

	private String operator;

	private String flowId;

	private Integer pageNo;

	private Integer pageSize;

}
