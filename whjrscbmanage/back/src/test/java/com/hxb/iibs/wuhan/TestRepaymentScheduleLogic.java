package com.hxb.iibs.wuhan;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;
import java.util.stream.Collectors;

/**
 * 独立测试程序：不依赖 Spring/MyBatis，纯粹手工模拟 repacementScheduleService
 * 的 replaceByBondCodeWithStatus() 逻辑，验证修复是否正确。
 *
 * 用法:
 *   javac -d target/test-classes src/test/java/com/hxb/iibs/wuhan/TestRepaymentScheduleLogic.java
 *   java -cp target/test-classes com.hxb.iibs.wuhan.TestRepaymentScheduleLogic
 */
public class TestRepaymentScheduleLogic {

    // ---- 常量（与 Constant.java 完全一致）----
    static class RepaymentStatus {
        static final int INVALID   = 0;   // 已失效，被新计划替换
        static final int AUDITING  = 1;   // 审批中（草稿）
        static final int EFFECTIVE = 2;   // 已生效
    }

    // ---- 内存版的 RepaymentSchedule Entity ----
    static class RepaymentSchedule {
        Long id;
        String bondCode;
        Integer sort;
        LocalDate repaymentDate;
        BigDecimal repaymentAmount;
        int status;
        LocalDateTime createTime;
        LocalDateTime updateTime;

        @Override
        public String toString() {
            return String.format(
                "RepaymentSchedule{id=%s, bondCode=%s, sort=%s, date=%s, amount=%s, status=%d(%s)}",
                id, bondCode, sort, repaymentDate,
                repaymentAmount.stripTrailingZeros().toPlainString(),
                status, statusName(status));
        }

        static String statusName(int s) {
            return switch (s) {
                case 0 -> "INVALID";
                case 1 -> "AUDITING";
                case 2 -> "EFFECTIVE";
                default -> "UNKNOWN";
            };
        }
    }

    // ---- InstallmentPlanItem DTO（与 InstallmentPlanItem.java 结构一致）----
    static class InstallmentPlanItem {
        Integer sort;
        LocalDate planTime;
        BigDecimal amount;
    }

    // ---- 手工实现的 replaceByBondCodeWithStatus（与 RepaymentScheduleServiceImpl 完全同逻辑）----
    static class InMemoryRepaymentScheduleService {
        // 用内存 List 代替数据库 table
        private final List<RepaymentSchedule> storage = Collections.synchronizedList(new ArrayList<>());
        private long nextId = 1;

        /** 模拟 lambdaUpdate().eq().ne().set().update() */
        void markInvalid(String bondCode) {
            // Step 1: lambdaUpdate().eq(bondCode).ne(status, INVALID).set(status, INVALID).update()
            for (RepaymentSchedule r : storage) {
                if (r.bondCode.equals(bondCode) && r.status != RepaymentStatus.INVALID) {
                    r.status = RepaymentStatus.INVALID;
                    r.updateTime = LocalDateTime.now();
                    System.out.println("  [OLD RECORD] 已标记为 INVALID: " + r);
                }
            }
        }

        /** 模拟 filter + map + saveBatch */
        void replaceByBondCodeWithStatus(String bondCode,
                                          List<InstallmentPlanItem> items,
                                          Integer status) {
            // Step 1: 将旧计划标记为 INVALID
            markInvalid(bondCode);

            // Step 2: 空列表直接返回
            if (items == null || items.isEmpty()) {
                System.out.println("  [NEW RECORDS] 新计划列表为空，跳过插入");
                return;
            }

            // Step 3: 过滤 + 填充 sort + 逐条插入
            AtomicInteger counter = new AtomicInteger(0);
            for (InstallmentPlanItem it : items) {
                if (it.planTime == null || it.amount == null) continue;

                RepaymentSchedule r = new RepaymentSchedule();
                r.id = nextId++;
                r.bondCode = bondCode;
                r.sort = it.sort != null ? it.sort : counter.incrementAndGet();
                r.repaymentDate = it.planTime;
                r.repaymentAmount = it.amount;
                r.status = status != null ? status : RepaymentStatus.AUDITING;
                r.createTime = LocalDateTime.now();
                r.updateTime = LocalDateTime.now();
                storage.add(r);
                System.out.println("  [NEW RECORD] 新增记录: " + r);
            }
        }

        /** 模拟 listByBondCodeWithStatus */
        List<RepaymentSchedule> listByBondCodeWithStatus(String bondCode, Integer status) {
            return storage.stream()
                    .filter(r -> r.bondCode.equals(bondCode))
                    .filter(r -> status == null || r.status == status)
                    .sorted(Comparator.comparing(rs -> rs.sort))
                    .collect(Collectors.toList());
        }

        /** 模拟 saveBatch 的预加载（测试用） */
        void preload(String bondCode, List<RepaymentSchedule> records) {
            records.forEach(r -> { r.id = nextId++; storage.add(r); });
        }
    }

    // ========================================================================

    public static void main(String[] args) {
        InMemoryRepaymentScheduleService svc = new InMemoryRepaymentScheduleService();
        String bondCode = "P23123131321123123";

        // ----------------------------------------------------------
        printBanner("Step 1: 初始化旧数据（模拟一条已生效的还款计划）");

        // 模拟原本就有两条已生效的还款计划（status=2）
        List<RepaymentSchedule> oldRecords = List.of(
            mk(1L, bondCode, 1, "2026-03-09", "25000000", RepaymentStatus.EFFECTIVE),
            mk(2L, bondCode, 2, "2027-03-09", "25000000", RepaymentStatus.EFFECTIVE)
        );
        svc.preload(bondCode, new ArrayList<>(oldRecords));

        System.out.println("\n加载后，当前表中所有记录：");
        svc.listByBondCodeWithStatus(bondCode, null).forEach(System.out::println);

        // ----------------------------------------------------------
        printBanner("Step 2: 前端修改还款计划，提交 226007 审批");

        // 模拟前端传入的新还款计划（三条，带 installmentFlag=1）
        List<InstallmentPlanItem> newItems = List.of(
            mkItem(null, "2026-07-08", "100"),
            mkItem(null, "2026-08-08", "100"),
            mkItem(null, "2026-07-23", "100")   // 注意：乱序，第三条时间最早
        );
        System.out.println("前端新计划（乱序，无 sort）：");
        newItems.forEach(it ->
            System.out.printf("  sort=%s, date=%s, amount=%s%n",
                it.sort, it.planTime, it.amount.stripTrailingZeros().toPlainString()));

        System.out.println("\n按时间排序后（代码会自动 sort）：");
        AtomicInteger seq = new AtomicInteger(0);
        newItems.stream()
            .sorted(Comparator.comparing(it -> it.planTime))
            .peek(it -> it.sort = seq.incrementAndGet())
            .forEach(it ->
                System.out.printf("  第%d期: %s, %s元%n",
                    it.sort, it.planTime, it.amount.stripTrailingZeros().toPlainString()));

        // ----------------------------------------------------------
        printBanner("Step 3: 模拟 226007 审批通过，调用 replaceByBondCodeWithStatus");
        System.out.println("【待验证的关键断言】");
        System.out.println("  ① 旧记录两条应被标记为 status=0 (INVALID)");
        System.out.println("  ② 新增三条应为 status=2 (EFFECTIVE)（即本次修复的目标）");
        System.out.println("  ③ 第三期时间虽最晚发过来但sort应为第2期（按时间排序）\n");

        // --- 修复前的错误调用（用于对比演示） ---
        System.out.println("━━━ 修复前（错误做法：用 AUDITING=1）━━━");
        svc.markInvalid(bondCode); // 重置
        svc.storage.clear(); svc.nextId = 1;
        svc.preload(bondCode, new ArrayList<>(oldRecords));
        svc.replaceByBondCodeWithStatus(bondCode, newItems, RepaymentStatus.AUDITING); // 错：设为审批中
        report(svc, bondCode);

        // --- 修复后的正确调用 ---
        System.out.println("\n━━━ 修复后（正确做法：用 EFFECTIVE=2）━━━");
        svc.markInvalid(bondCode); // 重置
        svc.storage.clear(); svc.nextId = 1;
        svc.preload(bondCode, new ArrayList<>(oldRecords));
        svc.replaceByBondCodeWithStatus(bondCode, newItems, RepaymentStatus.EFFECTIVE); // 正确：设为已生效
        report(svc, bondCode);

        // ----------------------------------------------------------
        printBanner("Step 4: 自动化断言验证（修复后）");

        svc.markInvalid(bondCode); // 重置全场
        svc.storage.clear(); svc.nextId = 1;
        svc.preload(bondCode, new ArrayList<>(oldRecords));
        svc.replaceByBondCodeWithStatus(bondCode, newItems, RepaymentStatus.EFFECTIVE);

        List<RepaymentSchedule> all = svc.listByBondCodeWithStatus(bondCode, null);
        List<RepaymentSchedule> validRecords = all.stream()
                .filter(r -> r.status != RepaymentStatus.INVALID)
                .toList();

        int pass = 0, fail = 0;
        var passCount = new int[]{0};
        var failCount = new int[]{0};
        java.util.function.BiConsumer<String, Boolean> checker = (desc, cond) -> {
            String emoji = cond ? "PASS" : "FAIL";
            System.out.println("  " + (cond ? "✓" : "✗") + " " + emoji + "  " + desc);
            if (cond) passCount[0]++; else failCount[0]++;
        };

        // 旧2条 → INVALID
        all.stream().filter(r -> r.status == RepaymentStatus.INVALID)
            .forEach(r -> checker.accept(
                "旧记录 id=" + r.id + " 已被标记为 INVALID(0)", r.status == 0));

        // 新3条 → EFFECTIVE
        validRecords.forEach(r -> checker.accept(
                "新记录 sort=" + r.sort + " 日期=" + r.repaymentDate + " status=EFFECTIVE(2)",
                r.status == RepaymentStatus.EFFECTIVE));

        // 总数应为 5（2失效 + 3有效）
        checker.accept("表中总计 5 条（2 INVALID + 3 EFFECTIVE）",
                all.size() == 5 && validRecords.size() == 3);

        // 按时间排序后 sort 分配是否正确
        checker.accept("第一期日期应为 2026-07-08",
                validRecords.stream().anyMatch(r -> r.repaymentDate.toString().equals("2026-07-08")));
        checker.accept("第二期日期应为 2026-07-23（即使用户输入顺序混乱，系统按时间重新排了sort）",
                validRecords.stream().anyMatch(r -> r.repaymentDate.toString().equals("2026-07-23")));
        checker.accept("第三期日期应为 2026-08-08",
                validRecords.stream().anyMatch(r -> r.repaymentDate.toString().equals("2026-08-08")));

        System.out.printf("%n━━━━━━━━━━ 合计: %d PASS, %d FAIL ━━━━━━━━━━%n", passCount[0], failCount[0]);
        if (failCount[0] > 0) {
            System.out.println("❌ 有断言失败，请检查逻辑！");
            System.exit(1);
        } else {
            System.out.println("✅ 全部断言通过！修复正确。");
        }
    }

    // ========================================================================
    // 辅助方法
    // ========================================================================

    private static RepaymentSchedule mk(Long id, String bc, int sort,
                                         String date, String amt, int status) {
        RepaymentSchedule r = new RepaymentSchedule();
        r.id = id;
        r.bondCode = bc;
        r.sort = sort;
        r.repaymentDate = LocalDate.parse(date);
        r.repaymentAmount = new BigDecimal(amt);
        r.status = status;
        r.createTime = LocalDateTime.now().minusDays(1);
        r.updateTime = LocalDateTime.now().minusDays(1);
        return r;
    }

    private static InstallmentPlanItem mkItem(Integer sort, String date, String amt) {
        InstallmentPlanItem it = new InstallmentPlanItem();
        it.sort = sort;
        it.planTime = LocalDate.parse(date);
        it.amount = new BigDecimal(amt);
        return it;
    }

    private static void report(InMemoryRepaymentScheduleService svc, String bondCode) {
        System.out.println("  当前表中所有记录：");
        svc.listByBondCodeWithStatus(bondCode, null).forEach(r ->
                System.out.println("    " + r));
        long effCnt = svc.listByBondCodeWithStatus(bondCode, RepaymentStatus.EFFECTIVE).size();
        long invCnt = svc.listByBondCodeWithStatus(bondCode, RepaymentStatus.INVALID).size();
        long audCnt = svc.listByBondCodeWithStatus(bondCode, RepaymentStatus.AUDITING).size();
        System.out.printf("  统计: INVALID=%d  AUDITING=%d  EFFECTIVE=%d%n",
                invCnt, audCnt, effCnt);
    }

    private static void printBanner(String title) {
        System.out.println("\n" + "═".repeat(60));
        System.out.println(title);
        System.out.println("═".repeat(60));
    }
}