package com.hxb.iibs.wuhan.util;

import com.hxb.iibs.wuhan.dto.InstallmentPlanItem;
import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 分期还款计划文本解析工具。
 *
 * <p>支持以下格式：
 * <ul>
 *   <li>新版格式："第1期 2026-07-08 还款100元；第2期 2026-08-08 还款100元"</li>
 *   <li>JSON数组：[{"installmentTime":"2026-07-15","installmentAmount":100},...]</li>
 *   <li>旧版冒号分隔："2026-03-15:50000.00,2026-06-15:50000.00"</li>
 * </ul>
 */
@Slf4j
public class InstallmentPlanParser {

    /** 日期提取正则：匹配 YYYY-MM-DD 或 YYYY/MM/DD */
    private static final Pattern DATE_PATTERN = Pattern.compile("(\\d{4}[-/]\\d{1,2}[-/]\\d{1,2})");

    /** 金额提取正则：匹配"还款"或"还"后面的数字（支持千分位逗号） */
    private static final Pattern AMOUNT_PATTERN = Pattern.compile("(?:还款|还)\\s*([\\d,]+\\.?\\d*)元?");

    /**
     * 解析分期计划文本，返回结构化列表。
     *
     * @param raw 原始文本，支持三种格式（详见类注释）
     * @return 结构化列表，永不为 null
     */
    public static List<InstallmentPlanItem> parse(String raw) {
        List<InstallmentPlanItem> items = new ArrayList<>();
        if (raw == null || raw.isBlank()) return items;

        // 尝试 JSON 数组格式
        if (raw.trim().startsWith("[")) {
            try {
                return com.alibaba.fastjson2.JSON.parseArray(raw, InstallmentPlanItem.class);
            } catch (Exception e) {
                log.warn("[InstallmentPlanParser] JSON解析失败, raw={}, ex={}", raw, e.getMessage());
            }
        }

        // 尝试新版格式：第N期 YYYY-MM-DD 还款NNN元
        List<InstallmentPlanItem> newFormatItems = parseNewFormat(raw);
        if (!newFormatItems.isEmpty()) {
            return newFormatItems;
        }

        // 兼容旧版格式：逗号分隔的文本 "2026-07-15:100,2026-07-21:200"
        return parseOldFormat(raw);
    }

    /**
     * 解析新版格式："第1期 2026-07-08 还款100元；..."
     */
    private static List<InstallmentPlanItem> parseNewFormat(String raw) {
        List<InstallmentPlanItem> items = new ArrayList<>();

        String[] segments = raw.split("[；;]");
        for (int i = 0; i < segments.length; i++) {
            String seg = segments[i].trim();
            if (seg.isEmpty()) continue;

            // 提取日期
            Matcher dateMatcher = DATE_PATTERN.matcher(seg);
            if (!dateMatcher.find()) continue;
            String dateStr = dateMatcher.group(1).replace('/', '-');

            // 提现金额
            Matcher amountMatcher = AMOUNT_PATTERN.matcher(seg);
            if (!amountMatcher.find()) continue;
            String amountRaw = amountMatcher.group(1).replace(",", "");

            try {
                InstallmentPlanItem item = new InstallmentPlanItem();
                item.setSort(i + 1);
                item.setPlanTime(LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE));
                item.setAmount(new BigDecimal(amountRaw).setScale(2, RoundingMode.HALF_UP));
                items.add(item);
            } catch (Exception e) {
                log.warn("[InstallmentPlanParser] 新格式解析异常: segment={}, ex={}", seg, e.getMessage());
            }
        }

        return items;
    }

    /**
     * 解析旧版格式："2026-07-15:100,2026-07-21:200"
     */
    private static List<InstallmentPlanItem> parseOldFormat(String raw) {
        List<InstallmentPlanItem> items = new ArrayList<>();
        String[] parts = raw.split(",");

        for (int i = 0; i < parts.length; i++) {
            String part = parts[i].trim();
            if (!part.contains(":")) continue;
            String[] kv = part.split(":");
            if (kv.length != 2) continue;

            try {
                InstallmentPlanItem item = new InstallmentPlanItem();
                item.setSort(i + 1);
                item.setPlanTime(LocalDate.parse(kv[0].trim()));
                item.setAmount(new BigDecimal(kv[1].trim()).setScale(2, RoundingMode.HALF_UP));
                items.add(item);
            } catch (Exception e) {
                log.warn("[InstallmentPlanParser] 旧格式解析异常: part={}, ex={}", part, e.getMessage());
            }
        }
        return items;
    }

    /**
     * 将分期计划序列化为与前端一致的主表 JSON 字符串（installment_plan 列的存储格式）。
     *
     * <p>格式与 mock/前端约定一致：{@code [{"installmentTime":"YYYY-MM-DD","installmentAmount":"100"},…]}
     * （金额为无 0 尾的普通字符串）。
     */
    public static String toJson(List<InstallmentPlanItem> items) {
        if (items == null || items.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < items.size(); i++) {
            if (i > 0) sb.append(',');
            InstallmentPlanItem it = items.get(i);
            sb.append("{\"installmentTime\":\"")
              .append(it.getPlanTime() == null ? "" : it.getPlanTime().toString())
              .append("\",\"installmentAmount\":\"")
              .append(it.getAmount() == null ? "" : it.getAmount().stripTrailingZeros().toPlainString())
              .append("\"}");
        }
        return sb.append(']').toString();
    }
}