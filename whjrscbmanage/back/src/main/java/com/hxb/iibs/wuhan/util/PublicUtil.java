package com.hxb.iibs.wuhan.util;

import java.text.MessageFormat;
import java.util.Arrays;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class PublicUtil {

	public static String getUuid() {
		return getUuid(false);
	}

	public static String getUuid(boolean isKeepDash) {
		String s = UUID.randomUUID().toString();
		return isKeepDash ? s : s.replaceAll("-", "");
	}

	// 驼峰 转 下划线
	public static String underscoreName(String name) {
		return name.replaceAll("(?<!^)([A-Z])", "_$1");
	}

	// 下划线 转 驼峰
	public static String camelCaseName(String name) {
		String[] parts = name.split("_");
		if (1 == parts.length) {
			return parts[0];
		} else {
			return parts[0] + Arrays.stream(parts).skip(1).map(e -> e.substring(0, 1).toUpperCase() + e.substring(1)).collect(Collectors.joining());
		}
	}

	/**
	 * 字符串格式化<br>
	 * 基于{@linkplain MessageFormat MessageFormat}实现并兼容{@linkplain lombok.extern.slf4j.Slf4j @Slf4j}<br>
	 * log.info使用{}为占位符，而MessageFormat.format使用{n}为占位符，使用正则自动填充序号
	 *
	 * @param formatter
	 * @param arguments
	 * @return
	 */
	public static String format(String formatter, Object ... arguments) {
		if (null == arguments) {
			return formatter;
		}
		Matcher matcher = Pattern.compile("(\\{})").matcher(formatter);
		StringBuilder sb = new StringBuilder();
		int start = 0;
		int count = 0;
		while (matcher.find()) {
			sb.append(formatter.substring(start, matcher.start()));
			sb.append("{" + count++ + "}");
			start = matcher.end();
		}
		return MessageFormat.format(sb + formatter.substring(start), arguments);
	}
}
