package com.hxb.iibs.wuhan.exception;

import com.hxb.iibs.wuhan.util.PublicUtil;

/**
 * 自定义异常类型，提示内容会赋给 iibs.resp.head.respMsg
 */
public class BusiException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	private String code;

	private final Object[] arguments;

	public BusiException(String msg, Object... arguments) {
		super(msg);
		this.code = "99999";
		this.arguments = arguments;
	}

	public BusiException code(String code) {
		this.code = code;
		return this;
	}

	public String getCode() {
		return this.code;
	}

	@Override
	public String getMessage() {
		return PublicUtil.format(super.getMessage(), arguments);
	}

	@Override
	public String toString() {
		return this.getMessage() + ", code = " + this.code;
	}

}
