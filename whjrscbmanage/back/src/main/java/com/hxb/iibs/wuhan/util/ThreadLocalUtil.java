package com.hxb.iibs.wuhan.util;

import com.hxb.iibs.wuhan.entity.CommomArgs;
import com.hxb.iibs.wuhan.entity.HxbCpodAmt;

public class ThreadLocalUtil {
	private static ThreadLocal<CommomArgs> commomArgsThreadLocal = new InheritableThreadLocal<>();
	private static ThreadLocal<HxbCpodAmt> cpodThreadLocal = new InheritableThreadLocal<>();
	private static ThreadLocal<String> transCodeThreadLocal = new InheritableThreadLocal<>();
	private static ThreadLocal<String> flowCodeThreadLocal = new InheritableThreadLocal<>();

	public static void setCommomArgs(CommomArgs commomArgs) {
		commomArgsThreadLocal.set(commomArgs);
	}

	public static CommomArgs getCommomArgs() {
		return commomArgsThreadLocal.get();
	}

	public static void setHxbCpodAmt(HxbCpodAmt hxbCpodAmt) {
		cpodThreadLocal.set(hxbCpodAmt);
	}

	public static HxbCpodAmt getHxbCpodAmt() {
		return cpodThreadLocal.get();
	}

	public static void setTransCode(String transCode) {
		transCodeThreadLocal.set(transCode);
	}

	public static String getTransCode() {
		return transCodeThreadLocal.get();
	}

	public static void setFlowCode(String flowCode) {
		flowCodeThreadLocal.set(flowCode);
	}

	public static String getFlowCode() {
		return flowCodeThreadLocal.get();
	}
}
