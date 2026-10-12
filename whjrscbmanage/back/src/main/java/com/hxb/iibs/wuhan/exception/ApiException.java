package com.hxb.iibs.wuhan.exception;

import org.springframework.util.StringUtils;

/**
 * 自定义异常类型，用于调用 api
 */
public class ApiException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	private final String code;

	public ApiException(String code, String msg) {
		super(StringUtils.isEmpty(msg) ? "未知错误" : msg);
		this.code = code;
	}

	public String getCode() {
		return this.code;
	}
}
