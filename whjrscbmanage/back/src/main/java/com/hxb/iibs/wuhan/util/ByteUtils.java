package com.hxb.iibs.wuhan.util;

public class ByteUtils {

    public static byte[] fromHexString(String hexString) {
        // 检查字符串长度是否为偶数
        if (hexString.length() % 2 != 0) {
            throw new IllegalArgumentException("Hex string length must be even.");
        }

        int len = hexString.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            // 取出每两个字符
            String hexSubstring = hexString.substring(i, i + 2);
            // 解析为整数
            int halfByte = Integer.parseInt(hexSubstring, 16);
            data[i / 2] = (byte) halfByte;
        }
        return data;
    }
}
