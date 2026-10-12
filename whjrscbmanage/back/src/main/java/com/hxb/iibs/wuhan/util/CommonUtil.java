package com.hxb.iibs.wuhan.util;

import com.hxb.iibs.wuhan.exception.BusiException;
//import org.apache.commons.lang3.StringUtils;

public class CommonUtil {
	// 用于根据 16 位账号或客户号获取第 17 位的校验位
	private static final String CHECK_TABLE = "100908070605040302051004090308020701080502100704010906040801050902061003020406081001030507010203040506070809060107020803090410030609010407100205070310060209050108090705030110080604100908070605040302051004090308020701080502100704010906040801050902061003020406081001030507010203040506070809";

	public static String getActualNo(String no) {
//		if (StringUtils.isEmpty(no)) {
//			return "";
//		}
		if (no.length() == 16) {
			return getNoWithCheckBit(no);
		}
		return no;
	}

	private static String getNoWithCheckBit(String no) {
		StringBuilder temp_acct = new StringBuilder(no);
		try {
			temp_acct.append("0");
			int rawlen = temp_acct.length();
			if (17 == rawlen) {
				int sub_1 = rawlen - 1;
				int work_value = 0;
				while (sub_1 >= 0) {
					String s = temp_acct.substring(sub_1, sub_1 + 1);
					if (!s.equals("0")) {
						int sub_2 = Integer.parseInt(s);
						int var_1 = sub_1 * 18 + sub_2 * 2 - 1;
						work_value += Integer.parseInt(CHECK_TABLE.substring(var_1 - 1, var_1 + 1));
					}
					sub_1 = sub_1 - 1;
				}
				if (0 == work_value) {
					throw new BusiException("校验异常");
				} else {
					work_value = work_value % 10;
					return no.substring(0, 16) + work_value;
				}
			} else {
				throw new BusiException("校验异常");
			}
		} catch (Exception e) {
			throw new BusiException("校验异常");
		}
	}
}
