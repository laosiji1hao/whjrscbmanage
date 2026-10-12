package com.hxb.iibs.wuhan.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

public class DateUtil {

	// 标准日期格式（精简、标准）
	public static final DateTimeFormatter SIMPLE_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");
	public static final DateTimeFormatter SIMPLE_TIME_FORMATTER = DateTimeFormatter.ofPattern("HHmmss");
	public static final DateTimeFormatter SIMPLE_DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
	public static final DateTimeFormatter STANDARD_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
	public static final DateTimeFormatter STANDARD_TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");
	public static final DateTimeFormatter STANDARD_DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

	/**
	 * 获取当日日期字符串，本项目以标准格式为主
	 */
	public static String getNowStr(DateTimeFormatter formatter) {
		return LocalDateTime.now().format(formatter);
	}

	/**
	 * 获取当日日期字符串，本项目以标准格式为主
	 */
	public static String getTodayStr() {
		return LocalDate.now().format(STANDARD_DATE_FORMATTER);
	}

	/**
	 * 根据偏移量获取某一日期字符串
	 */
	public static String getOffsetDayStr(int offset) {
		return getOffsetDayStr(offset, STANDARD_DATE_FORMATTER);
	}
	/**
	 * 根据偏移量获取某一日期字符串
	 */
	public static String getOffsetDayStr(int offset, DateTimeFormatter formatter) {
		return LocalDate.now().plusDays(offset).format(formatter);
	}

	/**
	 * 根据偏移量获取某一日期字符串
	 */
	public static String getOffsetDayStr(String dateStr, int offset) {
		DateTimeFormatter dtf;
		if (dateStr.length() == 10) {
			dtf = STANDARD_DATE_FORMATTER;
		} else {
			dtf = SIMPLE_DATE_FORMATTER;
		}
		return LocalDate.parse(dateStr, dtf).plusDays(offset).format(dtf);
	}

	/**
	 * 字符串转换为日期
	 */
	public static LocalDate strToLocalDate(String dateStr) {
		DateTimeFormatter dtf;
		if (dateStr.length() == 10) {
			dtf = STANDARD_DATE_FORMATTER;
		} else {
			dtf = SIMPLE_DATE_FORMATTER;
		}
		return LocalDate.parse(dateStr, dtf);
	}

	/**
	 * 自动切换格式（纯数字 <-> 带分隔符）
	 */
	public static String autoChangeFormat(String datetime) {
		if (datetime.contains("-") || datetime.contains(":")) {
			// 带分隔符 -> 纯数字
			return datetime.replaceAll("[-: ]", "");
		} else {
			// 纯数字 -> 带分隔符
			if (6 == datetime.length()) {
				return LocalTime.parse(datetime, SIMPLE_TIME_FORMATTER).format(STANDARD_TIME_FORMATTER);
			} else if (8 == datetime.length()) {
				return LocalDate.parse(datetime, SIMPLE_DATE_FORMATTER).format(STANDARD_DATE_FORMATTER);
			} else if (14 == datetime.length()) {
				return LocalDateTime.parse(datetime, SIMPLE_DATETIME_FORMATTER).format(STANDARD_DATETIME_FORMATTER);
			} else {
				return datetime;
			}
		}
	}
}
