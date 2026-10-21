package com.hxb.iibs.wuhan.job;

import com.alibaba.fastjson2.JSON;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.hxb.iibs.wuhan.api.ICommonApi;
import com.hxb.iibs.wuhan.util.InstallmentPlanParser;
import com.hxb.iibs.wuhan.entity.*;
import com.hxb.iibs.wuhan.entity.ext.ExtBusBond;
import com.hxb.iibs.wuhan.enums.Constant;
import com.hxb.iibs.wuhan.exception.BusiException;
import com.hxb.iibs.wuhan.entity.ext.AssistedHandlerChangeVO;
import com.hxb.iibs.wuhan.entity.ext.AssistedUpdateVO;
import com.hxb.iibs.wuhan.entity.ext.IAssistFullReturnVO;
import com.hxb.iibs.wuhan.entity.ext.TerminateApprovalVO;
import com.hxb.iibs.wuhan.dto.InstallmentPlanItem;
import com.hxb.iibs.wuhan.mapper.ExtBusBondMapper;
import com.hxb.iibs.wuhan.mapper.IAssistedApprovalMapper;
import com.hxb.iibs.wuhan.mapper.WhfrUserMapper;
import com.hxb.iibs.wuhan.mapper.WhoaBranchInfoMapper;
import com.hxb.iibs.wuhan.service.IBusManagerChangeHistoryService;
import com.hxb.iibs.wuhan.service.IFlowDataService;
import com.hxb.iibs.wuhan.service.IBondsBusinessService;
import com.hxb.iibs.wuhan.service.IGapsPBaseService;
import com.hxb.iibs.wuhan.service.IHxbCpodFhcharProductSerialService;
import com.hxb.iibs.wuhan.service.IUpperStorageConfigService;
import com.hxb.iibs.wuhan.service.IRepaymentScheduleService;
import com.xxl.job.core.context.XxlJobHelper;
import com.xxl.job.core.handler.annotation.XxlJob;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import com.hxb.iibs.wuhan.util.PublicUtil;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static java.math.BigDecimal.ZERO;

@Slf4j
@Service
public class CommonJob {

    private static final String TASK_BOND_SYNC = "bondSync";

    @Value("${prj.id}")
    private String prjId;

    @Value("${bond.remind.days-ahead}")
    private int daysAhead;

    @Value("${bond.remind.recipients}")
    private String recipientsConfig;

    // ---- 原有依赖 ----
    @Autowired
    private IHxbCpodFhcharProductSerialService cpodService;
    @Autowired
    private IGapsPBaseService projectService;

    // ---- bondSync 依赖 ----
    @Autowired
    private ExtBusBondMapper extBusBondMapper;
    @Autowired
    private IBondsBusinessService bondsBusinessService;
    @Autowired
    private WhfrUserMapper whfrUserMapper;

    // ---- exerciseRemind 依赖 ----
    @Autowired
    private ICommonApi commonApi;

    // ---- assistedApprovalSync 依赖 ----
    @Autowired
    private IAssistedApprovalMapper approvalMapper;
    @Autowired(required = false)
    private WhoaBranchInfoMapper whoaBranchInfoMapper;
    @Autowired
    private IFlowDataService flowDataService;
    @Autowired
    private IBusManagerChangeHistoryService managerChangeHistoryService;
    @Autowired
    private IUpperStorageConfigService upperStorageConfigService;
    @Autowired
    private IRepaymentScheduleService repaymentScheduleService;


    // ============================================================
    //  原有用法保留不动
    // ============================================================

    /**
     * 总行运营数据收集定时任务<br>
     * 推荐执行时间: 每日凌晨<br>
     * 如果昨日无交易，则补上昨日的记录
     */
    @XxlJob("cpod")
    public void cpod() {
        GapsPBase project = projectService.getByProjectId(prjId);

        HxbCpodFhcharProductSerial cpod = cpodService.getLatestCpod();
        LocalDate startDate;
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd");
        if (null == cpod) {
            String accptDate = project.getOnlineDate();
            if (!StringUtils.hasText(accptDate)) {
                startDate = LocalDate.now().minus(1, ChronoUnit.DAYS);
            } else {
                try {
                    startDate = LocalDate.parse(accptDate, formatter);
                } catch (DateTimeParseException e) {
                    throw new BusiException("投产日期数据异常");
                }
            }
        } else {
            try {
                startDate = LocalDate.parse(cpod.getTransDate(), formatter).plus(1, ChronoUnit.DAYS);
            } catch (DateTimeParseException e) {
                throw new BusiException("交易日期数据异常");
            }
        }

        long days = startDate.until(LocalDate.now().plusDays(1), ChronoUnit.DAYS);
        log.info("应补上共 {} 日数据", days);
        for (int i = 0; i < days; i++) {
            String transDate = startDate.plus(i, ChronoUnit.DAYS).format(formatter);
            log.info("补上 {} 数据", transDate);
            cpodService.initCpod(transDate, project);
        }
    }

    // ============================================================
    //  第三批定时任务
    // ============================================================

    /**
     * bondSync — 从业务申报表同步数据到本地台账。<br>
     * 注册名：{@value #TASK_BOND_SYNC}<br>
     * Cron（建议）：每天凌晨 1 点<br>
     * <p>
     * 利用 apply_no 做差量对比（跨库操作）：
     * - Step1: 从 busiMobile 查出所有 approve_status='成功' 的 apply_no
     * - Step2: 从本地图查已存在的 apply_no，算出差集
     * - Step3: 再去 busiMobile 按 ID 范围拉取待同步的完整记录
     * - 单次任务尽力做完所有积压，分批每批 500 条
     */
    @XxlJob(TASK_BOND_SYNC)
    public void bondSync() {
        log.info("[{}] 定时任务开始", TASK_BOND_SYNC);

        // Step1: 从 busiMobile 查出所有"成功"的 apply_no 及对应 id
        List<String> allSuccessfulApplyNos = extBusBondMapper.selectList(
                Wrappers.<ExtBusBond>query()
                        .eq("approve_status", "成功")
                        .select("apply_no, id")
        ).stream()
                .map(e -> e.getApplyNo())
                .filter(s -> s != null && !s.isBlank())
                .distinct()
                .toList();

        if (allSuccessfulApplyNos.isEmpty()) {
            log.info("[{}] 无待同步数据（外部表无成功记录）", TASK_BOND_SYNC);
            XxlJobHelper.handleSuccess("synced=0");
            return;
        }

        log.info("[{}] 外部表共有 {} 个成功记录的 apply_no", TASK_BOND_SYNC, allSuccessfulApplyNos.size());

        // Step2: 从本地图查已存在的 apply_no
        Set<String> existedApplyNos = bondsBusinessService.list(
                        Wrappers.<BondsBusiness>query()
                                .isNotNull("apply_no")
                                .in("apply_no", allSuccessfulApplyNos)
                                .select("apply_no")
                ).stream()
                .map(BondsBusiness::getApplyNo)
                .collect(Collectors.toSet());

        // Step3: 计算差集，得到待同步的 apply_no
        List<String> toSyncApplyNos = allSuccessfulApplyNos.stream()
                .filter(no -> !existedApplyNos.contains(no))
                .toList();

        if (toSyncApplyNos.isEmpty()) {
            log.info("[{}] 无新数据需要同步（均已在业务主表中存在）", TASK_BOND_SYNC);
            XxlJobHelper.handleSuccess("synced=0");
            return;
        }

        log.info("[{}] 待同步 {} 条，去重后 {} 条", TASK_BOND_SYNC,
                allSuccessfulApplyNos.size(), toSyncApplyNos.size());

        // Step4: 分批同步
        int totalSynced = 0;
        int batchCount = 0;
        int idx = 0;

        while (idx < toSyncApplyNos.size()) {
            // 每批最多 500 条
            List<String> batchApplyNos = toSyncApplyNos.subList(
                    idx, Math.min(idx + 500, toSyncApplyNos.size()));

            // 去 busiMobile 查这批 apply_no 的完整记录
            List<ExtBusBond> batchRecords = extBusBondMapper.selectList(
                    Wrappers.<ExtBusBond>query()
                            .eq("approve_status", "成功")
                            .in("apply_no", batchApplyNos)
                            .orderByAsc("id")
            );

            if (batchRecords.isEmpty()) {
                idx += batchApplyNos.size();
                continue;
            }

            batchCount++;

            for (ExtBusBond src : batchRecords) {
                try {
                    BondsBusiness entity = buildFromExternal(src);
                    bondsBusinessService.save(entity);
                    totalSynced++;
                    commonApi.wxWorkMsgSend(entity.getCreator(), "您好，您在人民币信用债券投资业务申报表的项目名称为"+entity.getBizName()+"的业务已审批通过，请及时前往决策系统-金融市场部-债券业务台账-我的业务中补充业务信息");
                } catch (DuplicateKeyException ex) {
                    // 并发情况下可能被另一批次处理，打日志继续
                    log.warn("[{}] 跳过重复 apply_no={}", TASK_BOND_SYNC, src.getApplyNo());
                }
            }

            log.info("[{}] 第 {} 批完成，本批数量={}", TASK_BOND_SYNC, batchCount, batchRecords.size());
            idx += batchApplyNos.size();
        }

        log.info("[{}] 同步完成，总计同步 {} 条，执行 {} 批",
                TASK_BOND_SYNC, totalSynced, batchCount);
        XxlJobHelper.handleSuccess("synced=" + totalSynced);
    }

    /**
     * 构建待入库实体，从 rmb_credit_bond_declaration 同步字段。
     * 外部表字段名与业务主表字段名一致，部分字段需解码转换。
     *
     * @see plan-20260624-bond-sync-apply-no-diff
     */
    private BondsBusiness buildFromExternal(ExtBusBond src) {
        BondsBusiness entity = new BondsBusiness();
        entity.setBizUuid(PublicUtil.getUuid()); // 业务唯一键（区别于自增id与可改的bond_code）

        // apply_no 用于关联外部表和去重【226009 新增】
        entity.setApplyNo(src.getApplyNo());

        //默认同步为非标准（业务口径：人民币外部同步的业务 = 非标准业务）
        entity.setBondType("1");

        // 基本信息（字段名一致，直接映射）
        entity.setBizName(src.getBizName());
        entity.setCustomerName(src.getCustomerName());
        entity.setLeadUnderwriter(src.getLeadUnderwriter());
        entity.setAgreedUsage(src.getAgreedUsage());
        entity.setIntRating(src.getIntRating());

        // 担保情况：中文字符串转整数编码存库
        entity.setGuaranteeInfo(decodeGuaranteeMethod(src.getGuaranteeInfo()));

        // 内部评级日期
        entity.setIntRatingDate(parseDateStr(src.getIntRatingDate()));

        // 客户分类：中文文本转整数编码
        entity.setCustomerType(decodeCustomerType(src.getCustomerType()));

        // 经办人和机构
        entity.setCreator(src.getApplyOper());
        entity.setOrgCode(lookupOrgCodeByCreator(src.getApplyOper()));
        entity.setOrgName(resolveOrgNameByDeptId(entity.getOrgCode()));
        return entity;
    }

    private String resolveOrgNameByDeptId(String deptId) {
        if (whoaBranchInfoMapper == null || !StringUtils.hasText(deptId)) {
            return null;
        }
        WhoaBranchInfo branch = whoaBranchInfoMapper.selectOne(
                Wrappers.<WhoaBranchInfo>query()
                        .eq("branch_no", deptId)
                        .select("dept_name")
                        .last("LIMIT 1")
        );
        if (branch != null && StringUtils.hasText(branch.getDeptName())) {
            return branch.getDeptName();
        }
        return null;
    }

    /**
     * 将担保方式中文字符串转为整数编码，与 GuaranteeInfoEnum 对齐。
     * 信用=0，抵押=1，质押=2，保证=3，其他默认为信用。
     */
    private String decodeGuaranteeMethod(String method) {
        if (!StringUtils.hasText(method)) {
            return Constant.GuaranteeInfoEnum.CREDIT;
        }
        return switch (method.trim()) {
            case "信用" -> Constant.GuaranteeInfoEnum.CREDIT;
            case "抵押" -> Constant.GuaranteeInfoEnum.MORTGAGE;
            case "质押" -> Constant.GuaranteeInfoEnum.PLEDGE;
            case "保证" -> Constant.GuaranteeInfoEnum.GUARANTEE;
            default -> {
                log.warn("[buildFromExternal] 未知担保方式 '{}'，默认设为信用", method);
                yield Constant.GuaranteeInfoEnum.CREDIT;
            }
        };
    }

    /**
     * 日期格式转换（yyyy-MM-dd → LocalDate，避免报错截断）。
     */
    private LocalDate parseDateStr(String dateStr) {
        if (!StringUtils.hasText(dateStr)) {
            return null;
        }
        try {
            // 兼容斜杠分隔，统一转换为横线
            String normalized = dateStr.replace('/', '-');
            return LocalDate.parse(normalized, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException e) {
            log.warn("[buildFromExternal] 无法解析评级日期: {}，忽略该字段", dateStr);
            return null;
        }
    }

    /**
     * 客户分类：新表 biz_category_cd 为中文文本（一类/二类/三类/四类），
     * 主表 customer_type 为数字代码（0/1/2/3），需通过 CustomerTypeEnum.encode 转换。
     */
    private String decodeCustomerType(String categoryCd) {
        if (!StringUtils.hasText(categoryCd)) {
            return null;
        }
        String encoded = Constant.CustomerTypeEnum.encode(categoryCd);
        if (encoded == null) {
            log.warn("[buildFromExternal] 无法识别的客户分类 '{}'，忽略该字段", categoryCd);
        }
        return encoded;
    }

    /**
     * 根据客户经理 OA 号查 whfr_user.branch_no 作为 orgCode。
     * 只取有效在职员工（status='00'），查不到降级返回 null。
     */
    private String lookupOrgCodeByCreator(String creator) {
        if (!StringUtils.hasText(creator)) {
            return null;
        }
        WhfrUser user = whfrUserMapper.selectOne(
                Wrappers.<WhfrUser>query()
                        .eq("user_id", creator)
                        .eq("status", "00")
                        .select("branch_no")
                        .last("LIMIT 1")
        );
        if (user != null && StringUtils.hasText(user.getBranchNo())) {
            return user.getBranchNo();
        }
        return null;
    }

    // ============================================================

    /**
     * exerciseRemind — 行权日企微提醒。<br>
     * 注册名：exerciseRemind<br>
     * Cron（建议）：每天早上 9 点<br>
     * <p>
     * 发送条件：exercise_flag='1' 且 exercise_date - #{daysAhead} = 今天，且未被标记已发送。
     * 发完后立即将 exercise_reminder_sent 置 '1'，同一笔记录永不重复触发。
     */
    @XxlJob("exerciseRemind")
    @Transactional
    public void exerciseRemind() {
        log.info("[exerciseRemind] 定时任务开始，提前天数={}，接收人配置={}", daysAhead, recipientsConfig);

        LocalDate targetDate = LocalDate.now().plusDays(daysAhead);

        // 查询待提醒记录
        List<BondsBusiness> records = bondsBusinessService.list(Wrappers.<BondsBusiness>lambdaQuery()
                .eq(BondsBusiness::getStatus, Constant.BizStatus.EFFECTIVE)
                .eq(BondsBusiness::getExerciseFlag, Constant.Bool.YES)
                .eq(BondsBusiness::getExerciseDate, targetDate)
                .eq(BondsBusiness::getExerciseReminderSent, Constant.Bool.NO));

        if (records.isEmpty()) {
            log.info("[exerciseRemind] 今日（{}）无待提醒记录", targetDate);
            XxlJobHelper.handleSuccess("sent=0");
            return;
        }

        String[] recipients = recipientsConfig.split(",");
        int sentCount = 0;

        for (BondsBusiness record : records) {
            String msgContent = "您好，金融市场部台账债券编号为"+record.getBondCode()+"的业务行权日期为"+record.getExerciseDate()+"，请及时处理";

            boolean ok = true;
            for (String recipient : recipients) {
                String oa = recipient.trim();
                if (oa.isEmpty()) continue;
                try {
                    commonApi.wxWorkMsgSend(oa, msgContent);
                    log.debug("[exerciseRemind] 已向 {} 发送提醒，bizName={}", oa, record.getBizName());
                } catch (Exception ex) {
                    log.error("[exerciseRemind] 向 {} 发送失败，bizName={}", oa, record.getBizName(), ex);
                    ok = false; // 只要有一条失败就不标记已发，避免误判
                }
            }

            if (ok) {
                var uw = new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<BondsBusiness>();
                uw.eq(BondsBusiness::getId, record.getId());
                uw.set(BondsBusiness::getExerciseReminderSent, Constant.Bool.YES);
                bondsBusinessService.update(uw);
                sentCount++;
            }
        }

        log.info("[exerciseRemind] 处理完毕，成功发送 {} 条（共命中 {} 条）", sentCount, records.size());
        XxlJobHelper.handleSuccess("sent=" + sentCount);
    }

    /**
     * 拼现行权提醒消息正文。
     */
    private String buildRemindMessage(BondsBusiness record, int daysAhead) {
        return """
                【行权提醒】
                债券名称：%s
                客户名称：%s
                行权日期：%s（剩余 %d 天）
                客户经理：%s
                请及时处理！
                """.formatted(
                nullSafe(record.getBizName()),
                nullSafe(record.getCustomerName()),
                record.getExerciseDate(),
                daysAhead,
                nullSafe(record.getCreator())
        );
    }

    private String nullSafe(String val) {
        return (val != null) ? val : "(未知)";
    }

    
    /**
     * assistedApprovalSync — 从 i助手三张审批表拉取结论，驱动业务状态机。<br>
     * 注册名：assistedApprovalSync<br>
     * Cron（建议）：每 5 分钟一次（在 XXL-Job 控制台配置）<br>
     * <p>
     * 三条路并行扫表，每条约 500 条，循环处理直到无新数据。单条异常不打断整批，
     * 通过 approvalStatus=PENDING 做幂等保护，重跑不会重复写入。
     */
    @XxlJob("assistedApprovalSync")
    public void assistedApprovalSync() {
        long start = System.currentTimeMillis();
        int total = 0;

        // Step 0：从 master 库（whjrscbmanage）取待审批的 ybid 列表
        List<Long> ybids = approvalMapper.listPendingYbidsFromMaster(500);
        log.info("[assistedApprovalSync] 本次从 master 库捞到 {} 条待审批记录", ybids.size());
        if(!ybids.isEmpty()) {
            // Step 1-4：以 ybids 为桥梁，分别从 busiMobile 的四张业务表拉详情并处理
            total += processNewBusiness(approvalMapper.listNewBusinessApprovals(ybids));
            total += processUpdateBusiness(approvalMapper.listUpdateBusinessApprovals(ybids));
            total += processHandlerChange(approvalMapper.listHandlerChangeApprovals(ybids));
            total += processTerminateBusiness(approvalMapper.listTerminateApprovals(ybids));
        }
        log.info("[assistedApprovalSync] 完成，共处理 {} 条，耗时 {}ms",
                total, System.currentTimeMillis() - start);
        XxlJobHelper.handleSuccess("processed=" + total);
    }

    // ---- 226006 新增业务 ----

    /**
     * 处理 226006 新增业务的审批结果。
     *
     * <p>i助手会返回完整的业务数据，我们用这些数据构建全新的 BondsBusiness 记录写入本地 DB。
     */
    private int processNewBusiness(List<IAssistFullReturnVO> items) {
        int n = 0;
        for (var item : items) {
            try {
                BondsBusiness biz = buildBondsBusinessFromReturn(item);
                if ("成功".equals(item.getApproveStatus())) {
                    // 构建完整的业务对象
                    biz.setStatus(Constant.BizStatus.EFFECTIVE);
                    biz.setCreateTime(LocalDateTime.now());
                    biz.setUpdateTime(LocalDateTime.now());
                    // 自动计算上存利率
                    calcUpperStorageRate(biz);

                    // 【身份=biz_uuid】审批通过：若本地已有该 biz_uuid 的审核中草稿（审批流主链路），
                    // 直接更新为生效中，避免重复插入撞唯一键；其余情况才新建。
                    BondsBusiness draft = resolveBizByYbid(item.getYbid());
                    if (draft != null && StringUtils.hasText(draft.getBizUuid())
                            && draft.getBizUuid().equals(biz.getBizUuid())) {
                        biz.setId(draft.getId());
                        biz.setCreateTime(draft.getCreateTime());
                        bondsBusinessService.updateById(biz);
                    } else {
                        // 无同身份草稿：新建；若有同号其它审核中草稿（不同 biz_uuid），置退休
                        if (draft != null) {
                            bondsBusinessService.lambdaUpdate()
                                    .set(BondsBusiness::getStatus, Constant.BizStatus.PASS_RETIRE)
                                    .eq(BondsBusiness::getId, draft.getId())
                                    .update();
                        }
                        bondsBusinessService.save(biz);
                    }

                    // 还款计划：先将旧的审批中计划标记为已失效，再保存新的生效计划
                    if ("1".equals(biz.getInstallmentFlag()) && StringUtils.hasText(biz.getInstallmentPlan())) {
                        List<InstallmentPlanItem> planItems = parseInstallmentPlan(biz.getInstallmentPlan());
                        // replaceByBondCodeWithStatus 会自动将旧计划标记为 INVALID
                        repaymentScheduleService.replaceByBondCodeWithStatus(
                                biz.getBondCode(),
                                planItems,
                                Constant.RepaymentStatus.EFFECTIVE);
                    }

                } else {
                    // 审批拒绝：只记录警告日志，不写业务主体
                    log.warn("[processNewBusiness] 审批拒绝, bondCode={}, remark={}",
                            item.getBondCode(), item.getRemark());

                    // 【身份=biz_uuid】将审批流对应的本地草稿标记为新增审核失败（保留编号供自动沿用重报）
                    BondsBusiness draft = resolveBizByYbid(item.getYbid());
                    if (draft != null) {
                        bondsBusinessService.lambdaUpdate()
                                .set(BondsBusiness::getStatus, Constant.BizStatus.REJECTED)
                                .eq(BondsBusiness::getId, draft.getId())
                                .update();

                        // 同时将该债券的草稿还款计划标记为已失效
                        repaymentScheduleService.lambdaUpdate()
                                .eq(RepaymentSchedule::getBondCode, biz.getBondCode())
                                .eq(RepaymentSchedule::getStatus, Constant.RepaymentStatus.AUDITING)
                                .set(RepaymentSchedule::getStatus, Constant.RepaymentStatus.INVALID)
                                .update();
                    }
                }

                // 更新审批流水状态
                saveFlowData(item.getYbid(), item.getApproveStatus(), item.getRemark());
                n++;

            } catch (DuplicateKeyException dkex) {
                // 如果该 bondCode 已经存在（重复提交），跳过但不报错
                log.warn("[processNewBusiness] bondCode={} 已存在于本地DB，可能是重复提交，跳过",
                        item.getBondCode());
            } catch (Exception e) {
                log.error("[processNewBusiness] ybid={} 异常: {}", item.getYbid(), e.getMessage(), e);
            }
        }
        return n;
    }

    /**
     * 从 i助手返回的数据构建 BondsBusiness 对象。
     */
    private BondsBusiness buildBondsBusinessFromReturn(IAssistFullReturnVO item) {
        BondsBusiness biz = new BondsBusiness();
        biz.setBizUuid(StringUtils.hasText(item.getBizUuid()) ? item.getBizUuid() : PublicUtil.getUuid());

        // 基本信息
        biz.setBondCode(item.getBondCode());
        biz.setBizName(item.getBizName());
        biz.setCustomerNo(item.getCustomerNo());
        biz.setCustomerName(item.getCustomerName());
        biz.setBondType(decodeBondType(item.getBondType()));
        biz.setEcifCustomerNo(item.getEcifCustomerNo());
        biz.setGreenTechFlag(decodeGreenTechFlag(item.getGreenTechFlag()));

        // 评级信息
        biz.setExtRating(item.getExtRating());
        biz.setExtRatingDate(parseDate(item.getExtRatingDate()));
        biz.setRatingAgency(item.getRatingAgency());
        biz.setIntRating(item.getIntRating());
        biz.setIntRatingDate(parseDate(item.getIntRatingDate()));

        // 客户分类
        biz.setIndustry(decodeIndustry(item.getIndustry()));
        biz.setCustomerType(decodeCustomerType(item.getCustomerType()));
        biz.setAlertCustomer(decodeBool("否"));

        // 时间与金额
        biz.setStartDate(parseDate(item.getStartDate()));
        biz.setMatureDate(parseDate(item.getMatureDate()));
        biz.setCurrency(item.getCurrency());
        biz.setOrigAmount(toBigDecimal(item.getOriginAmount()));
        biz.setRmbAmount(toBigDecimal(item.getInitialAmount()));  // initial_amount -> rmbAmount
        biz.setBalance(toBigDecimal(item.getBalance()));
        biz.setInvestRate(toBigDecimal(item.getInvestRate()));
        biz.setTransferRate(toBigDecimal(item.getTransferRate()));

        // 风控与担保
        biz.setGuaranteeInfo(decodeGuaranteeInfo(item.getGuaranteeInfo()));
        biz.setBreachFlag(decodeBool("否"));
        biz.setFiveLevelClass("正常一档");
        biz.setFundUsedFlag(item.getSuperviseAccount() == null?"0":"1");
        biz.setFundUsedUp("0");
        biz.setInstallmentFlag(decodeBool(item.getInstallmentFlag()));
        biz.setOurBankUnderwrite(decodeBool(item.getOurBankUnderwrite()));

        // 管理归属
        biz.setManageLine("金融市场部");  // 默认值
        biz.setDept(item.getDept());     // 从 i助手回传
        biz.setAgreedUsage(item.getAgreedUsage());
        biz.setFundAccount(item.getFundAccount());
        biz.setFundAccountFlag(decodeBool(item.getFundAccountFlag()));
        biz.setSuperviseAccount(item.getSuperviseAccount());
        biz.setSuperviseAccountFlag(decodeBool(item.getSuperviseAccountFlag()));

        biz.setIsOriginalAm(decodeBool(item.getIsOriginalAm()));

        // 行使权
        biz.setExerciseFlag(decodeBool(item.getExerciseFlag()));
        biz.setExerciseDate(parseDate(item.getExerciseDate()));

        // 分期还款（installment_plan 是文本格式）
        biz.setInstallmentPlan(item.getInstallmentPlan());

        // 其他字段
        biz.setLeadUnderwriter(item.getLeadUnderwriter());
        biz.setDrawdownCheck(null);  // i助手不回传这个字段，留空
        biz.setRemark(item.getRemark());
        biz.setRemarkNumber(item.getRemarkNumber());
        biz.setIsPassage(decodeBool(item.getIsPassage()));
        biz.setPassageAmount(toBigDecimal(item.getPassageAmount()));
        biz.setJsRemark(item.getJsRemark());
        biz.setJsRemarkFlag(decodeBool(item.getJsRemarkFlag()));
        biz.setInspectFreq(item.getInspectFreq());
        biz.setInspectorPost(item.getInspectorPost());

        // 经办人信息（来自 i助手回传的 handler/org_name）
        biz.setBizType(Constant.BizTypeEnum.encode(item.getBizType()));
        biz.setCreator(item.getHandler());
        biz.setOrgCode(item.getOrgCode());
        biz.setOrgName(item.getOrgName());

        return biz;
    }

    // ---- 辅助转换方法 ----

    private String decodeBondType(String val) {
        if (val == null) return null;
        return switch (val.trim()) {
            case "标债" -> "0";
            case "非标" -> "1";
            default -> val;
        };
    }

    private String decodeGreenTechFlag(String val) {
        if (val == null) return null;
        return switch (val.trim()) {
            case "绿色" -> "0";
            case "科技" -> "1";
            case "养老" -> "2";
            case "不涉及" -> "3";
            default -> val;
        };
    }

    private String decodeIndustry(String val) {
        if (val == null) return null;
        return switch (val.trim()) {
            case "货币金融服务" -> "0";
            case "资本市场服务" -> "1";
            case "保险业" -> "2";
            case "其他金融业" -> "3";
            default -> val;
        };
    }

    // 【注】decodeCustomerType 方法在第 322 行已定义，使用 Constant.CustomerTypeEnum.encode

    private String decodeGuaranteeInfo(String val) {
        if (val == null) return null;
        return switch (val.trim()) {
            case "信用" -> "0";
            case "抵押" -> "1";
            case "质押" -> "2";
            case "保证" -> "3";
            case "混合" -> "4";
            default -> val;
        };
    }

    private String decodeBool(String val) {
        if (val == null) return null;
        return switch (val.trim()) {
            case "是", "true", "1" -> "1";
            case "否", "false", "0" -> "0";
            default -> val;
        };
    }

    private LocalDate parseDate(String val) {
        if (!StringUtils.hasText(val)) return null;
        try {
            return LocalDate.parse(val.substring(0, 10));
        } catch (DateTimeParseException e) {
            log.warn("[parseDate] 日期解析失败: {}", val);
            return null;
        }
    }

    private BigDecimal toBigDecimal(String val) {
        if (!StringUtils.hasText(val)) return null;
        try {
            return new BigDecimal(val);
        } catch (NumberFormatException e) {
            log.warn("[toBigDecimal] 数字解析失败: {}", val);
            return null;
        }
    }

    /**
     * 解析 installment_plan 文本，转换为结构化数组。
     * 委托给工具类处理，支持三种格式（详见 InstallmentPlanParser）。
     */
    private List<InstallmentPlanItem> parseInstallmentPlan(String raw) {
        return InstallmentPlanParser.parse(raw);
    }

    /**
     * 上存利率自动计算公式：coupon_rate - vat - surcharge - passage_amount。
     *
     * @param biz 业务实体（四字段 bizType/dept/isPassage/passageAmount 应已设置）
     */
    private void calcUpperStorageRate(BondsBusiness biz) {
        UpperStorageConfig cfg = upperStorageConfigService.getGlobalConfig();

        BigDecimal couponRate = Optional.ofNullable(cfg)
                .map(UpperStorageConfig::getCouponRate).orElse(ZERO);
        BigDecimal vat = Optional.ofNullable(cfg)
                .map(UpperStorageConfig::getVat).orElse(ZERO);
        BigDecimal surcharge = Optional.ofNullable(cfg)
                .map(UpperStorageConfig::getSurcharge).orElse(ZERO);

        BigDecimal channelFee = ZERO;
        if ("1".equals(biz.getIsPassage()) && biz.getPassageAmount() != null) {
            channelFee = biz.getPassageAmount();
        }

        BigDecimal rate = biz.getInvestRate().subtract(vat).subtract(surcharge).subtract(channelFee);
        biz.setUpperStorageRate(rate);

        log.info("[calcUpperStorageRate] bondCode={}, formula=[{}-{}-{}]-({})={}",
                biz.getBondCode(), biz.getInvestRate(), vat, surcharge, channelFee, rate);
    }

    // ---- 226007 修改业务 ----

    private int processUpdateBusiness(List<AssistedUpdateVO> voList) {
        int n = 0;
        for (var vo : voList) {
            try {
                // 先更新审批流水状态
                saveFlowData(vo.getYbid(), vo.getApproveStatus(), vo.getRemark());

                BondsBusiness biz = resolveBizByYbid(vo.getYbid());
                if (biz == null) {
                    log.warn("[processUpdateBusiness] ybid={} 对应的业务未找到（business_no={}），跳过",
                            vo.getYbid(), vo.getBondCode());
                    continue;
                }

                if ("失败".equals(vo.getApproveStatus())) {
                    // 审批拒绝：不修改业务数据，只记录日志
                    log.warn("[processUpdateBusiness] 审批拒绝, bondCode={}, remark={}",
                            vo.getBondCode(), vo.getRemark());
                    repaymentScheduleService.lambdaUpdate()
                            .eq(RepaymentSchedule::getBondCode, biz.getBondCode())
                            .eq(RepaymentSchedule::getStatus, Constant.RepaymentStatus.AUDITING)
                            .set(RepaymentSchedule::getStatus, Constant.RepaymentStatus.EFFECTIVE)
                            .update();

                } else if ("成功".equals(vo.getApproveStatus())) {
                    // 【本次改造】解析 update_context，逐字段应用变更（普通字段）
                    applyUpdateContext(biz, vo.getUpdateContext());
                    // 【修复】审批通过后，新还款计划应为已生效(EFFECTIVE=2)，而非审批中(AUDITING=1)
                    List<InstallmentPlanItem> newPlans = parseRepaymentPlanChange(vo.getUpdateContext());
                    if(newPlans.isEmpty()){
                        repaymentScheduleService.lambdaUpdate()
                                .eq(RepaymentSchedule::getBondCode, biz.getBondCode())
                                .eq(RepaymentSchedule::getStatus, Constant.RepaymentStatus.AUDITING)
                                .set(RepaymentSchedule::getStatus, Constant.RepaymentStatus.EFFECTIVE)
                                .update();
                    }else {
                        repaymentScheduleService.replaceByBondCodeWithStatus(
                                biz.getBondCode(), newPlans, Constant.RepaymentStatus.EFFECTIVE);
                    }
                    bondsBusinessService.updateById(biz);
                }
                n++;
            } catch (Exception e) {
                log.warn("[processUpdateBusiness] ybid={} 异常: {}", vo.getYbid(), e.getMessage());
            }
        }
        return n;
    }

    /**
     * 从 update_context 中解析还款计划变更，返回新计划列表。
     *
     * <p>格式示例："...;还款计划由[第1期 2026-03-09 25000000元；第2期 2027-03-09 25000000元]变更为[第1期 2026-03-09 30000000元]"
     *
     * @param updateContext 变更轨迹字符串
     * @return 新计划列表，如果无变更则返回空列表
     */
    private List<InstallmentPlanItem> parseRepaymentPlanChange(String updateContext) {
        if (!StringUtils.hasText(updateContext)) {
            return List.of();
        }

        // 查找"还款计划由[...]变为[...]"这一段
        int idx = updateContext.indexOf("还款计划由");
        if (idx == -1) {
            return List.of();  // 没有还款计划变更
        }

        // 提取从"还款计划由"到结尾的内容，找到"[...]变为[...]"部分
        String segment = updateContext.substring(idx);
        int bracketStart = segment.indexOf('[', "还款计划由".length());
        int arrowIdx = segment.indexOf("变为");
        if (bracketStart == -1 || arrowIdx == -1 || arrowIdx <= bracketStart) {
            return List.of();
        }

        // 提取新计划部分的 [...] 内容
        String newPlanSection = segment.substring(arrowIdx + "变为".length()).trim();
        if (newPlanSection.startsWith("[")) {
            int bracketEnd = newPlanSection.lastIndexOf(']');
            if (bracketEnd > 0) {
                newPlanSection = newPlanSection.substring(1, bracketEnd);
            } else {
                newPlanSection = newPlanSection.substring(1);
            }
        }

        // 解析每期的格式："第N期 YYYY-MM-DD XXXXXX元"
        List<InstallmentPlanItem> plans = new ArrayList<>();
        String[] periods = newPlanSection.split("；");
        for (String period : periods) {
            period = period.trim();
            if (period.isEmpty()) continue;

            InstallmentPlanItem item = parseSinglePeriod(period);
            if (item != null) {
                plans.add(item);
            }
        }

        return plans;
    }

    /**
     * 解析单期还款计划。
     *
     * <p>输入示例：
     * <ul>
     *   <li>旧格式："第1期 2026-03-09 25000000元"</li>
     *   <li>新格式："第1期 2026-07-08 还款100元"</li>
     * </ul>
     */
    private InstallmentPlanItem parseSinglePeriod(String text) {
        try {
            // 匹配"第N期"的数字
            java.util.regex.Pattern sortPattern = java.util.regex.Pattern.compile("^第(\\d+)期\\s*");
            java.util.regex.Matcher sortMatcher = sortPattern.matcher(text);
            if (!sortMatcher.find()) {
                return null;
            }
            Integer sort = Integer.parseInt(sortMatcher.group(1));

            // 去掉前面的"第N期 "后的剩余文本
            String remainder = text.substring(sortMatcher.end());

            // 匹配日期：YYYY-MM-DD 或 YYYY/MM/DD
            java.util.regex.Pattern datePattern = java.util.regex.Pattern.compile("(\\d{4}-\\d{1,2}-\\d{1,2}|\\d{4}/\\d{1,2}/\\d{1,2})");
            java.util.regex.Matcher dateMatcher = datePattern.matcher(remainder);
            if (!dateMatcher.find()) {
                return null;
            }
            String dateStr = dateMatcher.group().replace('/', '-');

            // 去掉日期后的文本，可能带有"还款"前缀
            String afterDate = remainder.substring(dateMatcher.end()).trim();
            // 可选地匹配"还款"前缀，然后再匹配金额
            java.util.regex.Pattern amountWithPrefix = java.util.regex.Pattern.compile("(?:还款)?\\s*([\\d,]+\\.?\\d*)\\s*元?$");
            java.util.regex.Matcher amountMatcher = amountWithPrefix.matcher(afterDate);
            if (!amountMatcher.find()) {
                return null;
            }
            String amountStr = amountMatcher.group(1).replace(",", "");

            InstallmentPlanItem item = new InstallmentPlanItem();
            item.setSort(sort);
            item.setPlanTime(LocalDate.parse(dateStr));
            item.setAmount(new BigDecimal(amountStr));
            return item;
        } catch (Exception e) {
            log.warn("[parseSinglePeriod] 无法解析分期文本 '{}': {}", text, e.getMessage());
            return null;
        }
    }

    /**
     * 将 update_context 字符串解析并应用到业务实体。
     *
     * <p>输入示例："ecif客户号由ABC变为DEF;客户编号由111变为222;通道费金额由10000变为20000"
     *
     * <p>算法：
     * <ol>
     *   <li>按 ";" 分割成若干段</li>
     *   <li>每段按 "由" 和 "变为" 进行三元组拆解：[字段中文名, 旧值, 新值]</li>
     *   <li>根据字段中文名查到对应的 setter，回填新值</li>
     * </ol>
     */
    private void applyUpdateContext(BondsBusiness biz, String updateContext) {
        if (!StringUtils.hasText(updateContext)) {
            log.debug("[applyUpdateContext] update_context 为空，无需处理");
            return;
        }

        String[] segments = updateContext.split(";");
        int applied = 0;

        for (String segment : segments) {
            String trimmed = segment.trim();
            if (trimmed.isEmpty()) continue;

            // 格式：「XXX由YYY变为ZZZ」
            int fromIdx = trimmed.indexOf("由");
            int toIdx = trimmed.indexOf("变为");

            if (fromIdx == -1 || toIdx == -1 || fromIdx >= toIdx) {
                log.warn("[applyUpdateContext] 无法解析分段 '{}'，跳过", trimmed);
                continue;
            }

            String fieldLabel = trimmed.substring(0, fromIdx);          // 如 "ecif客户号"
            String newValue = trimmed.substring(toIdx + 2);            // "变为" 之后的部分

            FieldMapping mapping = CONTEXT_FIELD_MAP.get(fieldLabel);
            if (mapping == null) {
                log.trace("[applyUpdateContext] 未知字段标签 '{}'，跳过", fieldLabel);
                continue;
            }

            // 调用对应 setter，注意类型转换（日期/BigDecimal/布尔）
            setFieldValue(biz, mapping.propertyName, mapping.type, newValue);
            applied++;

            log.debug("[applyUpdateContext] 应用变更: {} <- '{}'", fieldLabel, newValue);
        }

        log.info("[applyUpdateContext] bondCode={}, 共应用 {} 项变更", biz.getBondCode(), applied);
    }

    /** update_context 字段中文名 → Entity 属性名 + 类型提示 */
    private static final Map<String, FieldMapping> CONTEXT_FIELD_MAP = Map.ofEntries(
            Map.entry("ecif客户号", new FieldMapping("ecifCustomerNo", TypeHint.STRING)),
            Map.entry("客户编号", new FieldMapping("customerNo", TypeHint.STRING)),
            Map.entry("客户名称", new FieldMapping("customerName", TypeHint.STRING)),
            Map.entry("债券名称", new FieldMapping("bizName", TypeHint.STRING)),
            Map.entry("标债类型", new FieldMapping("bondType", TypeHint.ENUM)),
            Map.entry("绿色科技标识", new FieldMapping("greenTechFlag", TypeHint.ENUM)),
            Map.entry("业务品种", new FieldMapping("bizType", TypeHint.ENUM)),
            Map.entry("外部评级", new FieldMapping("extRating", TypeHint.STRING)),
            Map.entry("外评日期", new FieldMapping("extRatingDate", TypeHint.DATE)),    // 【补全】
            Map.entry("评级机构", new FieldMapping("ratingAgency", TypeHint.STRING)),
            Map.entry("内部评级", new FieldMapping("intRating", TypeHint.STRING)),
            Map.entry("内评日期", new FieldMapping("intRatingDate", TypeHint.DATE)),     // 【补全】
            Map.entry("行业分类", new FieldMapping("industry", TypeHint.ENUM)),
            Map.entry("客户分类", new FieldMapping("customerType", TypeHint.ENUM)),
            Map.entry("预警客户", new FieldMapping("alertCustomer", TypeHint.BOOL)),
            Map.entry("发放日", new FieldMapping("startDate", TypeHint.DATE)),
            Map.entry("到期日", new FieldMapping("matureDate", TypeHint.DATE)),
            Map.entry("币种", new FieldMapping("currency", TypeHint.STRING)),
            Map.entry("初始金额（原币）", new FieldMapping("origAmount", TypeHint.DECIMAL)),
            Map.entry("初始金额（折人民币）", new FieldMapping("rmbAmount", TypeHint.DECIMAL)),
            Map.entry("业务余额", new FieldMapping("balance", TypeHint.DECIMAL)),
            Map.entry("投资利率", new FieldMapping("investRate", TypeHint.DECIMAL)),
            Map.entry("转让利率", new FieldMapping("transferRate", TypeHint.DECIMAL)),
            Map.entry("担保情况", new FieldMapping("guaranteeInfo", TypeHint.ENUM)),
            Map.entry("分期还款", new FieldMapping("installmentFlag", TypeHint.BOOL)),
            Map.entry("我行承销", new FieldMapping("ourBankUnderwrite", TypeHint.BOOL)),
            Map.entry("主承销商", new FieldMapping("leadUnderwriter", TypeHint.STRING)),
            Map.entry("约定资金用途", new FieldMapping("agreedUsage", TypeHint.STRING)),
            Map.entry("资金账户", new FieldMapping("fundAccount", TypeHint.STRING)),
            Map.entry("资金账户标记", new FieldMapping("fundAccountFlag", TypeHint.BOOL)),
            Map.entry("监管账户", new FieldMapping("superviseAccount", TypeHint.STRING)),
            Map.entry("监管账户标记", new FieldMapping("superviseAccountFlag", TypeHint.BOOL)),
            Map.entry("违约标识", new FieldMapping("breachFlag", TypeHint.BOOL)),
            Map.entry("五级分类", new FieldMapping("fiveLevelClass", TypeHint.STRING)),
            Map.entry("管理条线", new FieldMapping("manageLine", TypeHint.STRING)),
            Map.entry("是否原资管部回表", new FieldMapping("isOriginalAm", TypeHint.BOOL)),
            Map.entry("是否行权", new FieldMapping("exerciseFlag", TypeHint.BOOL)),
            Map.entry("行权日期", new FieldMapping("exerciseDate", TypeHint.DATE)),
            Map.entry("批复号", new FieldMapping("remarkNumber", TypeHint.STRING)),
            Map.entry("是否有通道费", new FieldMapping("isPassage", TypeHint.BOOL)),
            Map.entry("通道费金额", new FieldMapping("passageAmount", TypeHint.DECIMAL)),
            Map.entry("上存利率", new FieldMapping("upperStorageRate", TypeHint.DECIMAL)),
            Map.entry("批复管理要求", new FieldMapping("remark", TypeHint.STRING)),
            Map.entry("市场部批复", new FieldMapping("jsRemark", TypeHint.STRING)),
            Map.entry("是否有金融市场部批复管理要求", new FieldMapping("jsRemarkFlag", TypeHint.BOOL)),
            Map.entry("我行监管资金是否已使用完毕", new FieldMapping("fundUsedUp", TypeHint.BOOL)),
            Map.entry("检查频率", new FieldMapping("inspectFreq", TypeHint.STRING)),
            Map.entry("检查岗位", new FieldMapping("inspectorPost", TypeHint.STRING))
    );

    /** 辅助内部类 */
    private record FieldMapping(String propertyName, TypeHint type) {}

    /** 类型提示枚举 */
    private enum TypeHint {
        STRING,   // 直接存字符串
        BOOL,     // "是"/"否" 或 "1"/"0" 转 String
        DATE,     // yyyy-MM-dd 解析为 LocalDate
        DECIMAL,  // 解析为 BigDecimal
        ENUM      // 中文显示值转回编码（encode），存入数据库
    }

    private void setFieldValue(Object target, String propName, TypeHint hint, String rawValue) {
        try {
            Method setter = Arrays.stream(target.getClass().getMethods())
                    .filter(m -> m.getName().equalsIgnoreCase("set" + propName)
                            && m.getParameterCount() == 1)
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("找不到 setter: " + propName));

            // 空字符串表示要将字段设为空值，不再跳过
            if (rawValue.isEmpty()) {
                Class<?> paramType = setter.getParameterTypes()[0];
                if (paramType == String.class) {
                    setter.invoke(target, "");
                } else {
                    setter.invoke(target, (Object) null);
                }
                log.debug("[setFieldValue] {} 设为空值", propName);
                return;
            }

            Object converted = switch (hint) {
                case STRING -> rawValue;
                case BOOL -> parseBool(rawValue);
                case DATE -> LocalDate.parse(rawValue);
                case DECIMAL -> new BigDecimal(rawValue);
                case ENUM -> encodeForEnum(propName, rawValue);  // 将中文显示值转回编码
            };

            setter.invoke(target, converted);
        } catch (ReflectiveOperationException e) {
            log.warn("[setFieldValue] 反射设值失败: {}({}) <- '{}': {}",
                    propName, hint, rawValue, e.getMessage());
        }
    }

    /**
     * 将枚举字段的中文显示值转回编码值，用于定时任务同步 update_context 回数据库。
     */
    private String encodeForEnum(String propertyName, String label) {
        return switch (propertyName) {
            case "bondType" -> Constant.BondTypeEnum.encode(label);
            case "greenTechFlag" -> Constant.GreenTechFlag.encode(label);
            case "bizType" -> Constant.BizTypeEnum.encode(label);
            case "industry" -> Constant.IndustryEnum.encode(label);
            case "customerType" -> Constant.CustomerTypeEnum.encode(label);
            case "guaranteeInfo" -> Constant.GuaranteeInfoEnum.encode(label);
            default -> label;  // 其余字段原样保存
        };
    }

    /** 解析布尔值：接受 "是"/"否"、"1"/"0"、空串 */
    private String parseBool(String val) {
        if (val == null) return "0";
        return switch (val.trim()) {
            case "是", "1", "true" -> "1";
            case "否", "0", "false" -> "0";
            default -> val; // 无法识别时保留原值
        };
    }

    // ---- 226008 变更客户经理 ----

    private int processHandlerChange(List<AssistedHandlerChangeVO> items) {
        int n = 0;
        for (var item : items) {
            try {
                if (!"成功".equals(item.getApproveStatus())) {
                    // 驳回：不处理主表和历史表，只推进 FlowData
                    saveFlowData(item.getYbid(), item.getApproveStatus(), item.getRemark());
                    continue;
                }

                BondsBusiness biz = resolveBizByYbid(item.getYbid());
                if (biz == null) {
                    log.warn("[processHandlerChange] ybid={} 对应的业务未找到（business_no={}），跳过",
                            item.getYbid(), item.getBondCode());
                    saveFlowData(item.getYbid(), item.getApproveStatus(), item.getRemark());
                    continue;
                }

                // ① INSERT 历史记录（changeManager 已不再同步写，此处全权负责）
                var existingHist = managerChangeHistoryService.lambdaQuery()
                        .eq(BusManagerChangeHistory::getBusinessId, biz.getBizUuid())
                        .oneOpt();
                if (existingHist.isEmpty()) {
                    BusManagerChangeHistory hist = new BusManagerChangeHistory();
                    hist.setBusinessId(biz.getBizUuid());
                    hist.setOldHandler(item.getOldHandler());
                    hist.setOldOrgCode(item.getOldOrgCode());
                    hist.setOldOrgName(item.getOldOrgName());
                    hist.setNewHandler(item.getNewHandler());
                    hist.setNewOrgCode(item.getNewOrgCode());
                    hist.setNewOrgName(item.getNewOrgName());
                    // applicantOa 从 master 库 iassist_flow_data 兜底读取
                    FlowData fd = flowDataService.getById(item.getYbid());
                    if (fd != null) {
                        hist.setApplicantOa(fd.getApplicantOa());
                    }
                    hist.setCreateTime(java.time.LocalDateTime.now());
                    managerChangeHistoryService.save(hist);
                }

                // ② 更新主表三个字段
                biz.setCreator(item.getNewHandler());
                biz.setOrgCode(item.getNewOrgCode());
                biz.setOrgName(item.getNewOrgName());
                bondsBusinessService.updateById(biz);

                saveFlowData(item.getYbid(), item.getApproveStatus(), item.getRemark());
                n++;
            } catch (Exception e) {
                log.warn("[processHandlerChange] ybid={} 异常: {}", item.getYbid(), e.getMessage());
            }
        }
        return n;
    }

    // ---- 226009 中止业务 ----

    /**
     * 处理 226009 中止业务的审批结果。
     *
     * <p>审批通过后，才将本地业务状态改为 TERMINATED。与新增/修改业务保持一致的审批制流程。
     */
    private int processTerminateBusiness(List<TerminateApprovalVO> items) {
        int n = 0;
        for (var item : items) {
            try {
                if ("成功".equals(item.getApproveStatus())) {
                    BondsBusiness biz = resolveBizByYbid(item.getYbid());
                    if (biz == null) {
                        log.warn("[processTerminateBusiness] bondCode={} 在本方未找到，跳过", item.getBondCode());
                        saveFlowDataWithoutRemark(item.getYbid(), item.getApproveStatus());
                    } else {
                        biz.setStatus(Constant.BizStatus.TERMINATED);
                        biz.setUpdateTime(LocalDateTime.now());
                        bondsBusinessService.updateById(biz);
                        log.info("[processTerminateBusiness] 业务已中止, bondCode={}", item.getBondCode());
                        saveFlowDataWithoutRemark(item.getYbid(), item.getApproveStatus());
                        repaymentScheduleService.lambdaUpdate()
                                .eq(RepaymentSchedule::getBondCode, biz.getBondCode())
                                .eq(RepaymentSchedule::getStatus, Constant.RepaymentStatus.AUDITING)
                                .set(RepaymentSchedule::getStatus, Constant.RepaymentStatus.INVALID)
                                .update();
                    }
                } else {
                    // 审批驳回：只记录日志，推进 FlowData
                    log.warn("[processTerminateBusiness] 中止申请被驳回, bondCode={}", item.getBondCode());
                    saveFlowDataWithoutRemark(item.getYbid(), item.getApproveStatus());
                }
                n++;
            } catch (Exception e) {
                log.error("[processTerminateBusiness] ybid={} 异常: {}", item.getYbid(), e.getMessage(), e);
            }
        }
        return n;
    }

    /** 更新审批流水状态（不含 remark） */
    private void saveFlowDataWithoutRemark(Long ybid, String approveStatusStr) {
        FlowData fd = flowDataService.getById(ybid);
        if (fd != null && fd.getApprovalStatus() == Constant.ApprovalStatus.PENDING) {
            int statusCode = "成功".equals(approveStatusStr)
                    ? Constant.ApprovalStatus.PASS
                    : Constant.ApprovalStatus.REJECT;
            fd.setApprovalStatus(statusCode);
            flowDataService.updateById(fd);
        }
    }

    // ============================================================

    /**
     * expireCheck — 检测到期业务并标记为已过期。<br>
     * 注册名：expireCheck<br>
     * Cron（建议）：每天凌晨 0:30<br>
     * <p>
     * 判断逻辑：如果业务到期日（matureDate）为昨天，则将其状态从"生效中"(3)更新为"已过期"(4)。<br>
     * 仅影响 status=3 且 mature_date=yesterday 的记录，幂等安全。
     */
    @XxlJob("expireCheck")
    public void expireCheck() {
        log.info("[expireCheck] 定时任务开始");

        LocalDate targetDate = LocalDate.now().minusDays(1); // 到期日为昨天

        // 查询待过期业务列表
        List<BondsBusiness> expiredList = bondsBusinessService.list(
                Wrappers.<BondsBusiness>query()
                        .eq("status", Constant.BizStatus.EFFECTIVE)
                        .eq("mature_date", targetDate)
        );

        if (expiredList.isEmpty()) {
            log.info("[expireCheck] 今日无待过期业务");
            XxlJobHelper.handleSuccess("expired=0");
            return;
        }

        // 逐条更新状态
        int updated = 0;
        for (BondsBusiness biz : expiredList) {
            boolean ok = bondsBusinessService.lambdaUpdate()
                    .eq(BondsBusiness::getId, biz.getId())
                    .set(BondsBusiness::getStatus, Constant.BizStatus.EXPIRED)
                    .set(BondsBusiness::getUpdateTime, LocalDateTime.now())
                    .update();
            if (ok) updated++;
            //更新划款计划
            repaymentScheduleService.lambdaUpdate()
                    .eq(RepaymentSchedule::getBondCode, biz.getBondCode())
                    .eq(RepaymentSchedule::getStatus, Constant.RepaymentStatus.EFFECTIVE)
                    .set(RepaymentSchedule::getStatus, Constant.RepaymentStatus.INVALID)
                    .update();
        }

        log.info("[expireCheck] 处理完毕，更新 {} 条为已过期（共命中 {} 条）", updated, expiredList.size());
        XxlJobHelper.handleSuccess("expired=" + updated);
    }

    // ---- 共用工具方法 ----

    private BondsBusiness findBizByBondCode(String bondCode) {
        if (bondCode == null) return null;
        return bondsBusinessService.lambdaQuery()
                .eq(BondsBusiness::getBondCode, bondCode)
                .oneOpt()
                .orElse(null);
    }

    /** 按审批流解析本地业务：流 business_no 现为 biz_uuid（身份=唯一键），兼容迁移前 bond_code 存量流 */
    private BondsBusiness resolveBizByYbid(Long ybid) {
        if (ybid == null) return null;
        FlowData fd = flowDataService.getById(ybid);
        if (fd == null || fd.getBusinessNo() == null || fd.getBusinessNo().isEmpty()) return null;
        BondsBusiness biz = findBizByBizUuid(fd.getBusinessNo());
        if (biz != null) return biz;
        return findBizByBondCode(fd.getBusinessNo());
    }

    private BondsBusiness findBizByBizUuid(String bizUuid) {
        if (bizUuid == null || bizUuid.isEmpty()) return null;
        return bondsBusinessService.lambdaQuery()
                .eq(BondsBusiness::getBizUuid, bizUuid)
                .oneOpt()
                .orElse(null);
    }

    private void saveFlowData(Long ybid, String approveStatusStr, String remark) {
        FlowData fd = flowDataService.getById(ybid);
        if (fd != null && fd.getApprovalStatus() == Constant.ApprovalStatus.PENDING) {
            int statusCode = "成功".equals(approveStatusStr)
                    ? Constant.ApprovalStatus.PASS
                    : Constant.ApprovalStatus.REJECT;
            fd.setApprovalStatus(statusCode);
            fd.setResultComment(remark);
            flowDataService.updateById(fd);
        }
    }
}