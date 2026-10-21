package com.hxb.iibs.wuhan.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.baomidou.mybatisplus.extension.toolkit.Db;
import com.alibaba.fastjson2.JSONObject;
import com.hxb.iibs.wuhan.api.ICommonApi;
import com.hxb.iibs.wuhan.api.IDataFactoryApi;
import com.hxb.iibs.wuhan.dto.AccountStatusVO;
import com.hxb.iibs.wuhan.dto.BondBusinessQueryReq;
import com.hxb.iibs.wuhan.dto.BondBusinessSaveDTO;
import com.hxb.iibs.wuhan.dto.InstallmentPlanItem;
import com.hxb.iibs.wuhan.entity.BondsBusiness;
import com.hxb.iibs.wuhan.entity.BusManagerChangeHistory;
import com.hxb.iibs.wuhan.entity.ITfHelperMain;
import com.hxb.iibs.wuhan.entity.RepaymentSchedule;
import com.hxb.iibs.wuhan.entity.WhfrUser;
import com.hxb.iibs.wuhan.entity.WhoaBranchInfo;
import com.hxb.iibs.wuhan.mapper.IAssistedApprovalMapper;
import com.hxb.iibs.wuhan.mapper.WhfrUserMapper;
import com.hxb.iibs.wuhan.mapper.WhoaBranchInfoMapper;
import com.hxb.iibs.wuhan.enums.Constant;
import com.hxb.iibs.wuhan.exception.BusiException;
import com.hxb.iibs.wuhan.mapper.BondBusinessMapper;
import com.hxb.iibs.wuhan.service.IBondsBusinessService;
import com.hxb.iibs.wuhan.service.IBusManagerChangeHistoryService;
import com.hxb.iibs.wuhan.service.IIAssistService;
import com.hxb.iibs.wuhan.service.IRepaymentScheduleService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.BeanUtils;

@Slf4j
@Service
public class BondsBusinessServiceImpl
        extends ServiceImpl<BondBusinessMapper, BondsBusiness>
        implements IBondsBusinessService {

    @Autowired
    private ICommonApi commonApi;
    @Autowired
    private IDataFactoryApi dataFactoryApi;
    @Autowired
    private IIAssistService iassistService;
    @Autowired(required = false)
    private WhfrUserMapper whfrUserMapper;
    @Autowired(required = false)
    private WhoaBranchInfoMapper whoaBranchInfoMapper;
    @Autowired
    private IBusManagerChangeHistoryService managerChangeHistoryService;
    @Autowired
    private IRepaymentScheduleService repaymentScheduleService;

    /**
     * 226006 新增债券业务。
     * 校验 bondCode 不为空且不重复，持久化主表及还款计划子表，
     * 然后向 i助手发送新增审批流（flow_001）。
     *
     * @param dto 前端传来的业务字段，自动由 JsonStructureFilter 解包后 Jackson 反序列化，无需手动解析
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveBusiness(BondBusinessSaveDTO dto) {
        // 【本次新增】226006 新增业务：43个必填字段强校验
        validateMandatoryFieldsForNewBusiness(dto);

        // 【biz_uuid 身份改造】bond_code 不再是唯一身份（已切换为 biz_uuid），允许重复，
        // 不再按 bond_code 查重拦截（如"创建分期"沿用同一债券编号是新业务、新 biz_uuid）。

        // 有 businessId → 从本地查草稿作基础，发 i助手审批；无 businessId → 纯新增，同样只转发给 i助手
        // 两路均不先写本地 DB，等审批通过后由 assistedApprovalSync 定时任务统一落地
        if (StringUtils.hasText(dto.getBusinessId())) {  // 空串=businessId 未传=新增
            BondsBusiness existingRecord = this.getOne(new LambdaQueryWrapper<BondsBusiness>()
                    .eq(BondsBusiness::getBizUuid, dto.getBusinessId()));
            if (existingRecord == null) {
                throw new BusiException("要更新的业务记录不存在，businessId=" + dto.getBusinessId());
            }

            //修改本地草稿的状态为审核中
            existingRecord.setStatus(1);
            existingRecord.setBondCode(dto.getBondCode());
            this.updateById(existingRecord);

            // 以本地草稿为基础，把 DTO 里的变更合并上去，但不写库
            BondsBusiness merged = convertToEntity(dto, existingRecord);
            merged.setStatus(Constant.BizStatus.AUDITING);
            merged.setUpdateTime(LocalDateTime.now());

            if ("1".equals(dto.getInstallmentFlag())) {
                repaymentScheduleService.replaceByBondCodeWithStatus(
                        merged.getBondCode(),
                        dto.getInstallmentItems(),
                        Constant.RepaymentStatus.AUDITING);
                List<InstallmentPlanItem> Items = fillMissingSort(dto.getInstallmentItems());
                merged.setInstallmentPlan(buildInstallmentPlanTextFromItems(Items));
            }

            // 只发 i助手，保持和无 businessId 分支一致的流程
            sendIAssist(merged, "add_new_business", "flow_001", dto.getOperator());
            log.info("[saveBusiness] 基于预填记录提交i助手审批, id={}", dto.getBusinessId());
            return;
        }

        // 无 businessId → 全新插入，只发 i助手，不写本地 DB
        if (!StringUtils.hasText(dto.getBondCode())) {
            throw new BusiException("债券编号不能为空");
        }


        // 构造临时 entity 用于 sendIAssist（fillBusinessFields 从 entity 取值构建报文）
        BondsBusiness entity = convertToEntity(dto, new BondsBusiness());
        entity.setStatus(Constant.BizStatus.AUDITING);
        entity.setCreateTime(LocalDateTime.now());
        entity.setUpdateTime(LocalDateTime.now());
        // isPassage/passageAmount/upperStorageRate 保持从 DTO 来的值即可，
        // 发给 i助手后，审批通过后会由定时任务从 i助手回传的最新值覆盖

        // 同时将还款计划保存为"审批中"状态（草稿），供后续比对使用
        if ("1".equals(dto.getInstallmentFlag())) {
            repaymentScheduleService.replaceByBondCodeWithStatus(
                    entity.getBondCode(),
                    dto.getInstallmentItems(),
                    Constant.RepaymentStatus.AUDITING);
            List<InstallmentPlanItem> Items = fillMissingSort(dto.getInstallmentItems());
            entity.setInstallmentPlan(buildInstallmentPlanTextFromItems(Items));
        }

        // 发 i助手审批（全量报文，不写本地 DB）
        sendIAssist(entity, "add_new_business", "flow_001", dto.getOperator());
        log.info("[saveBusiness] 226006 新增业务已提交i助手审批, bondCode={}", entity.getBondCode());
    }

    /**
     * 226007 修改债券业务。
     * 校验记录存在后更新主表，向 i助手发送审批流（目标表：update_business_accountmanager）。
     *
     * <p>【本次改造】采用精简9字段模式，通过 buildUpdateContext() 生成变更轨迹。
     *
     * @param id           业务记录主键
     * @param dto          修改后的业务字段
     * @param updaterType  发起角色："0"=客户经理，"1"=业务管理员
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateBusiness(String id, BondBusinessSaveDTO dto, String updaterType) {
        // 【本次新增】226007 修改业务：49个必填字段强校验
        validateMandatoryFieldsForUpdateBusiness(dto);

        BondsBusiness entity = this.getOne(new LambdaQueryWrapper<BondsBusiness>()
                .eq(BondsBusiness::getBizUuid, id));
        if (entity == null) {
            throw new BusiException("业务记录不存在");
        }
        if (entity.getStatus() != null && entity.getStatus() == Constant.BizStatus.TERMINATED) {
            throw new BusiException("已中止的业务不能再修改");
        }

        // 保存老快照，用于 diff
        final BondsBusiness oldEntityCopy = cloneAsIs(entity);
        String oldBond = entity.getBondCode(); // 改号联动前记录旧债券编号

        entity = convertToEntity(dto, entity);
        entity.setUpdateTime(LocalDateTime.now());

        // 【身份=biz_uuid】改号不再需要重链：还款计划已并入主表，审批流以 biz_uuid 关联
        String newBond = entity.getBondCode();
        if (oldBond != null && newBond != null && !oldBond.equals(newBond)) {
            log.info("[updateBusiness] 债券编号由 {} 改为 {}（审批流/计划按 biz_uuid 关联，无需重链）", oldBond, newBond);
        }

        // 【本次改造】比对新旧还款计划，生成 update_context
        List<String> extraChanges = new ArrayList<>();
        // 查询已生效的还款计划（status=2）进行比对
        List<RepaymentSchedule> oldSchedules =
                repaymentScheduleService.listByBondCodeWithStatus(entity.getBondCode(), Constant.RepaymentStatus.EFFECTIVE);

        // 先取出原始数据
        List<InstallmentPlanItem> rawItems = dto.getInstallmentItems();

        // 校验：若开启分期，installment 不能为空，且每期的时间和金额必填
        if ("1".equals(dto.getInstallmentFlag())) {
            if (rawItems == null || rawItems.isEmpty()) {
                throw new BusiException("请填写分期还款计划");
            }
            boolean hasInvalidRow = rawItems.stream()
                    .anyMatch(item -> item.getPlanTime() == null || item.getAmount() == null);
            if (hasInvalidRow) {
                throw new BusiException("分期计划的还款时间和金额均为必填项，请完善后提交");
            }
        }

        // 自动填充 sort（前端可能没传）
        // 若不分期（installmentFlag != "1"），清空分期列表，避免无效数据干扰比对逻辑
        List<InstallmentPlanItem> newItems = "1".equals(dto.getInstallmentFlag())
                ? fillMissingSort(rawItems)
                : Collections.emptyList();

        String oldPlanText = buildInstallmentPlanText(oldSchedules);
        String newPlanText = buildInstallmentPlanTextFromItems(newItems);

        if (!Objects.equals(oldPlanText, newPlanText)) {
            String change = "还款计划由[" + nullSafe(oldPlanText) + "]变为[" + nullSafe(newPlanText) + "]";
            extraChanges.add(change);
        }

        // 生成 update_context（基于 oldEntityCopy vs dto）
        String updateContext = buildUpdateContext(oldEntityCopy, dto, extraChanges);

        // 写出新计划（无论是否有变化都要写，因为可能删除了所有期次）
        repaymentScheduleService.replaceByBondCode(entity.getBondCode(), newItems);

        String tabName = "update_business_accountmanager";
        sendIAssist226007(entity, tabName, "flow_002", updaterType, dto.getOperator(), updateContext);
        log.info("修改业务已提交审批[id={}, updaterType={}]", id, updaterType);
    }

    /**
     * 226008 变更客户经理。
     * 保存变更前的老信息，向 i助手发送变更审批流，
     * 由 updaterType 决定走哪个流程（accountmanager 或 busimanager）。
     *
     * @param id          业务记录主键
     * @param newCreator  新客户经理 OA 工号
     * @param newOrgCode  新客户经理所属机构编码
     * @param newOrgName  新客户经理所属机构名称
     * @param updaterType "0"=客户经理，"1"=业务管理员
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void changeManager(String id, String newCreator, String newOrgCode,
                              String newOrgName, String updaterType, String operator) {
        BondsBusiness entity = this.getOne(new LambdaQueryWrapper<BondsBusiness>()
                .eq(BondsBusiness::getBizUuid, id));
        if (entity == null) {
            throw new BusiException("业务记录不存在");
        }

        String oldCreator = entity.getCreator();
        String oldOrgCode = entity.getOrgCode();
        String oldOrgName = entity.getOrgName();

        // 新客户经理机构规范化：orgCode 从 whfr_user 查，orgName 沿用业务表中的值
        String normalizedOrgCode = StringUtils.hasText(newOrgCode) ? newOrgCode
                : resolveOrgCodeByCreator(newCreator);
        String normalizedOrgName = StringUtils.hasText(newOrgName) ? newOrgName
                : entity.getOrgName();

        String effectiveOperator = StringUtils.hasText(operator) ? operator : newCreator;

        // 所有数据库改动（主表更新 + 历史记录）均由定时任务 assistedApprovalSync 完成
        sendChangeManagerIAssist(entity, oldCreator, oldOrgCode, oldOrgName,
                newCreator, normalizedOrgCode, normalizedOrgName, updaterType, effectiveOperator);
        log.info("变更客户经理成功（待审批）, id={}, oldCreator={}, newCreator={}", id, oldCreator, newCreator);
    }

    /**
     * 按业务唯一键(biz_uuid)中止业务（226009 前端已改传 businessId=biz_uuid）。
     * 只发 i助手，等审批通过后由定时任务落地本地状态。
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void terminateByBizUuid(String bizUuid, String terminator, String updaterType) {
        BondsBusiness entity = this.getOne(new LambdaQueryWrapper<BondsBusiness>()
                .eq(BondsBusiness::getBizUuid, bizUuid));
        if (entity == null) {
            throw new BusiException("业务记录不存在[bizUuid=" + bizUuid + "]");
        }
        if (entity.getStatus() != null && entity.getStatus() == Constant.BizStatus.TERMINATED) {
            throw new BusiException("该业务已是中止状态");
        }
        sendIAssist226009(entity, terminator, updaterType);
        log.info("[terminateByBizUuid] 已提交i助手审批, bizUuid={}, terminator={}", bizUuid, terminator);
    }

    /**
     * 根据客户经理 OA 号查 whfr_user.branch_no 作为 orgCode。
     * 只取有效在职员工（status='00'），查不到返回 null。
     */
    private String resolveOrgCodeByCreator(String creator) {
        if (whfrUserMapper == null || !StringUtils.hasText(creator)) {
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

    /**
     * 根据部门编号（deptId，即 branch_no）查 whoa_branch_info.dept_name 作为 orgName。
     *
     * @param deptId 部门编号（来自 whfr_user.branch_no）
     * @return 部门名称，查不到返回 null
     */
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
     * 根据债券编号提交中止业务审批到 i助手。
     *
     * <p>与 226006/226007/226008 一致，采用审批制：
     * 只转发给 i助手，不在本地立即改变状态。等 i助手审批通过后，
     * 由 assistedApprovalSync 定时任务将本地状态改为 TERMINATED。
     *
     * @param bondCode    债券编号（必填，唯一）
     * @param terminator  操作人 OA 工号
     * @param updaterType 变更人类型："0"=客户经理，"1"=业务管理员
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void terminateByBondCode(String bondCode, String terminator, String updaterType) {
        // 根据 bondCode 查询业务记录
        LambdaQueryWrapper<BondsBusiness> wrapper = Wrappers.lambdaQuery();
        wrapper.eq(BondsBusiness::getBondCode, bondCode);
        BondsBusiness entity = this.getOne(wrapper);

        if (entity == null) {
            throw new BusiException("业务记录不存在[bondCode=" + bondCode + "]");
        }
        if (entity.getStatus() != null && entity.getStatus() == Constant.BizStatus.TERMINATED) {
            throw new BusiException("该业务已是中止状态");
        }

        // 只发 i助手，等审批通过后再落地本地状态
        sendIAssist226009(entity, terminator, updaterType);

        log.info("[terminateByBondCode] 已提交i助手审批, bondCode={}, terminator={}", bondCode, terminator);
    }

    /**
     * 226009 专用：发送中止业务请求到 i助手。
     *
     * <p>ybid 由 iassistService.sendIAssist() 自动填充（先写审计表得自增主键），
     * 故此处只需塞入5个业务字段即可。
     */
    private void sendIAssist226009(BondsBusiness entity, String terminator, String updaterType) {
        ITfHelperMain main = new ITfHelperMain();
        main.setTabName("terminate_business");
        main.setProjectId("terminate_business");
        main.setOperateType("btn_commit");
        main.setDstSchema("busi_mobile");
        main.setTriggerWorkflow("true");
        main.setReqNo("");
        main.setOperatePersonnel(terminator);

        // 只塞5个字段，ybid 让 sendIAssist 自动填充
        main.addDataItem("bond_code",    entity.getBondCode());
        main.addDataItem("biz_uuid",     entity.getBizUuid());
        main.addDataItem("biz_name",     entity.getBizName() != null ? entity.getBizName() : "");
        main.addDataItem("updator",      terminator);
        main.addDataItem("apply_date",   LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));

        iassistService.sendIAssist(main, "flow_006");

        log.info("[sendIAssist226009] bondCode={}, terminator={}", entity.getBondCode(), terminator);
    }

    /**
     * 分页查询债券业务列表，支持按业务名称模糊搜索、按状态精确筛选，
     * 结果按创建时间倒序排列。
     *
     * @param req 包含分页参数（pageNum/pageSize）及过滤条件
     * @return 分页结果，含列表、总记录数、总页数
     */
    @Override
    public Page<BondsBusiness> queryPage(BondBusinessQueryReq req) {
        LambdaQueryWrapper<BondsBusiness> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(req.getBizName())) {
            wrapper.like(BondsBusiness::getBizName, req.getBizName());
        }
        if (req.getStatus() != null) {
            wrapper.eq(BondsBusiness::getStatus, req.getStatus());
        }
        wrapper.orderByDesc(BondsBusiness::getCreateTime);
        return this.page(new Page<>(req.getPageNum(), req.getPageSize()), wrapper);
    }

    /**
     * 根据客户编号查询 ECIF 客户号和客户名称。
     * 第一步调数据工厂 cms_no_td_info 参数 cms_host_no 获取 ecif 客户号，
     * 第二步调总行公共服务 200328 获取客户名称。
     * 任一步骤失败不影响另一步，结果中对应字段为空字符串。
     */
    @Override
    public Map<String, String> getCustomerInfoByCustNo(String custNo) {
        Map<String, String> result = new HashMap<>();
        result.put("ecifCustomerNo", "");
        result.put("customerName", "");

        if (!StringUtils.hasText(custNo)) {
            throw new BusiException("cust_no 不能为空");
        }

        // 第一步：cms_no_td_info 根据客户编号获取 ECIF 客户号
        try {
            Map<String, Object> body1 = new HashMap<>();
            body1.put("cms_host_no", custNo);
            JSONObject resp1 = dataFactoryApi.queryNoTdInfo(body1);
            if (resp1 != null && resp1.containsKey("data")
                    && !resp1.getJSONArray("data").isEmpty()) {
                String ecifCustomerNo = resp1.getJSONArray("data")
                        .getJSONObject(0).getString("cb_host_no");
                result.put("ecifCustomerNo", ecifCustomerNo != null ? ecifCustomerNo : "");

                // 第二步：200328 根据 ECIF 客户号查询客户名称
                if (StringUtils.hasText(ecifCustomerNo)) {
                    try {
                        Map<String, Object> body2 = new HashMap<>();
                        body2.put("cusNo", ecifCustomerNo);
                        body2.put("operType", "1");
                        JSONObject resp2 = commonApi.queryCustomerInfo(body2);
                        if (resp2 != null && resp2.containsKey("cusName")) {
                            result.put("customerName", resp2.getString("cusName"));
                        }
                    } catch (Exception ex) {
                        log.warn("200328 查询失败, ecifCustomerNo={}: {}", ecifCustomerNo, ex.getMessage());
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("cms_no_td_info 查询失败, custNo={}: {}", custNo, ex.getMessage());
        }

        return result;
    }

    /**
     * 查询账户状态（22600A）。
     *
     * <p>调用 200115 账户状态查询，检查 status 是否为 AS00。
     * 若账号不可用则抛 BusiException。
     *
     * @param acctNo 账号
     * @return 账户信息（只包含核心字段）
     * @throws BusiException 账号不可用时抛出，消息为 i助手返回的 statusTxt
     */
    @Override
    public AccountStatusVO queryAccountStatus(String acctNo) {
        if (!StringUtils.hasText(acctNo)) {
            throw new BusiException("acctNo 不能为空");
        }

        JSONObject resp = commonApi.queryAccountStatus(acctNo);

        String status = resp.getString("status");
        String statusTxt = resp.getString("statusTxt");

        if (!"AS00".equals(status)) {
            throw new BusiException("账号不可用，当前状态：" + statusTxt + "（" + status + "）");
        }

        AccountStatusVO vo = new AccountStatusVO();
        vo.setAccountNo(acctNo);
        vo.setAccountName(resp.getString("accountName"));
        vo.setCustomerNo(resp.getString("customerNo"));
        vo.setStatus(status);
        vo.setStatusTxt(statusTxt);
        vo.setCurrency(resp.getString("currency"));
        vo.setCurrentBalance(resp.getString("currentBalance"));

        return vo;
    }

    // ===== 字段映射 =====

    /**
     * 将 DTO 中已由 Jackson 反序列化好的字段（LocalDate / BigDecimal 等天然类型）
     * 逐个拷贝到 Entity 对象，并自动推导 FLAG 类字段。
     */
    private BondsBusiness convertToEntity(BondBusinessSaveDTO dto, BondsBusiness entity) {
        entity.setBondType(dto.getBondType());
        entity.setEcifCustomerNo(dto.getEcifCustomerNo());
        entity.setCustomerNo(dto.getCustomerNo());
        entity.setCustomerName(dto.getCustomerName());
        entity.setBizName(dto.getBizName());
        entity.setGreenTechFlag(dto.getGreenTechFlag());
        entity.setBondCode(dto.getBondCode());
        entity.setExtRating(dto.getExtRating());
        entity.setExtRatingDate(dto.getExtRatingDate());
        entity.setRatingAgency(dto.getRatingAgency());
        entity.setIntRating(dto.getIntRating());
        entity.setIntRatingDate(dto.getIntRatingDate());
        entity.setIndustry(dto.getIndustry());
        entity.setCustomerType(dto.getCustomerType());
        entity.setAlertCustomer(dto.getAlertCustomer());
        entity.setBizType(dto.getBizType());
        entity.setStartDate(dto.getStartDate());
        entity.setMatureDate(dto.getMatureDate());

        // 金额三元组
        entity.setCurrency(dto.getCurrency() != null ? dto.getCurrency() : "CNY");
        entity.setOrigAmount(dto.getOrigAmount());
        entity.setRmbAmount(dto.getRmbAmount() != null ? dto.getRmbAmount() : dto.getOrigAmount()); // 默认折人民币=原币

        entity.setBalance(dto.getBalance());
        entity.setInvestRate(dto.getInvestRate());
        entity.setTransferRate(dto.getTransferRate());
        entity.setGuaranteeInfo(dto.getGuaranteeInfo());
        entity.setBreachFlag(dto.getBreachFlag());
        entity.setFiveLevelClass(dto.getFiveLevelClass());
        entity.setFundUsedUp(dto.getFundUsedUp());
        entity.setInstallmentFlag(dto.getInstallmentFlag());
        entity.setInstallmentPlan(dto.getInstallmentPlan());

        // 【本次改造】分期还款计划已迁移到 bus_repayment_schedule 明细表，此处不再解析 installmentPlan

        entity.setLeadUnderwriter(dto.getLeadUnderwriter());  // 主承销商【226006 新增】

        entity.setOurBankUnderwrite(dto.getOurBankUnderwrite());
        entity.setManageLine(dto.getManageLine());
        entity.setDept(dto.getDept());
        entity.setAgreedUsage(dto.getAgreedUsage());
        entity.setDrawdownCheck(dto.getDrawdownCheck());
        entity.setFundAccount(dto.getFundAccount());
        entity.setSuperviseAccount(dto.getSuperviseAccount());
        entity.setIsOriginalAm(dto.getIsOriginalAm());
        entity.setExerciseFlag(dto.getExerciseFlag());
        entity.setExerciseDate(dto.getExerciseDate());
        entity.setRemark(dto.getRemark());
        // 【本次新增】上存利率相关字段
        entity.setRemarkNumber(dto.getRemarkNumber());
        entity.setIsPassage(dto.getIsPassage());
        entity.setPassageAmount(dto.getPassageAmount());
        entity.setUpperStorageRate(dto.getUpperStorageRate());  // 226006 由定时任务覆盖，226007 可人工干预
        entity.setJsRemark(dto.getJsRemark());
        entity.setInspectFreq(dto.getInspectFreq());
        entity.setInspectorPost(dto.getInspectorPost());
        entity.setCreator(dto.getOperator());
        // orgCode 和 orgName 均通过 creator（OA工号）关联查询，不再从 DTO 直接取值
        String deptId = resolveOrgCodeByCreator(entity.getCreator());
        entity.setOrgCode(deptId);
        entity.setOrgName(resolveOrgNameByDeptId(deptId));

        // FLAG 字段：直接取前端传入值
        entity.setFundAccountFlag(dto.getFundAccountFlag());
        entity.setSuperviseAccountFlag(dto.getSuperviseAccountFlag());
        entity.setJsRemarkFlag(dto.getJsRemarkFlag());

        return entity;
    }

    
    // ===== i助手相关方法 =====

    /**
     * 向 i助手发送新增业务的审批请求。
     * apply_type 为 "0"。
     *
     * @param entity   已持久化的业务记录
     * @param tabName  i助手物理表名，如 "add_new_business"
     * @param flowCode 审计用流程编号，如 "flow_001"
     * @param operator 操作人 OA 工号（即为 creator）
     */
    private void sendIAssist(BondsBusiness entity, String tabName,
                              String flowCode, String operator) {
        ITfHelperMain main = buildIAssistMain(entity, tabName, flowCode, operator);
        main.addDataItem("apply_date", LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));
        main.addDataItem("apply_type", "0");
        iassistService.sendIAssist(main, flowCode);
    }

    /**
     * 向 i助手发送修改业务的审批请求。
     * apply_type 为 "1"，并补填 updator 系列字段。
     *
     * @param entity     已持久化的业务记录
     * @param tabName     i助手物理表名，如 "update_business_accountmanager"
     * @param flowCode    审计用流程编号，如 "flow_002"
     * @param updaterType 发起角色："0"=客户经理，"1"=业务管理员
     * @param operator    操作人 OA 工号（当前提交修改的人）
     */
    private void sendIAssist(BondsBusiness entity, String tabName,
                              String flowCode, String updaterType, String operator) {
        ITfHelperMain main = buildIAssistMain(entity, tabName, flowCode, operator);
        main.addDataItem("apply_date", LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));
        main.addDataItem("apply_type", "1");
        main.addDataItem("updator", operator);
        main.addDataItem("updator_org_code", entity.getOrgCode());
        main.addDataItem("updator_org_name", entity.getOrgName());
        main.addDataItem("updator_type", updaterType);
        iassistService.sendIAssist(main, flowCode);
    }

    /**
     * 向 i助手发送变更客户经理的审批请求。
     * 两路共用同一张表 update_business_handler_accountmanager，依据 updaterType 区分流程：
     * "0" → flow_004（客户经理发起）
     * "1" → flow_005（业务管理员发起）
     *
     * 发送字段严格按 BA 规格文档 2.4/2.5，只含必要的识别和变更信息，不带主表全部字段。
     */
    private void sendChangeManagerIAssist(BondsBusiness entity,
                                          String oldCreator, String oldOrgCode, String oldOrgName,
                                          String newCreator, String newOrgCode, String newOrgName,
                                          String updaterType, String effectiveOperator) {
        String flowCode = "1".equals(updaterType) ? "flow_005" : "flow_004";

        ITfHelperMain main = new ITfHelperMain();
        main.setTabName("update_business_handler_accountmanager");
        main.setProjectId("update_business_handler_accountmanager");
        main.setOperateType("btn_commit");
        main.setDstSchema("busi_mobile");
        main.setTriggerWorkflow("true");
        main.setReqNo("");
        main.setOperatePersonnel(effectiveOperator);

        // 公共必要字段
        main.addDataItem("bond_code", entity.getBondCode());
        main.addDataItem("biz_uuid", entity.getBizUuid()); // 审批流以 biz_uuid 关联
        main.addDataItem("biz_name", entity.getBizName());
        main.addDataItem("updator_type", updaterType);
        main.addDataItem("apply_date", LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));

        // 旧新变更信息（两路均发，定时任务侧需要用来写历史表）
        main.addDataItem("apply_oper",effectiveOperator);
        main.addDataItem("old_handler", oldCreator);
        main.addDataItem("old_org_code", oldOrgCode);
        main.addDataItem("old_org_name", oldOrgName);
        main.addDataItem("new_handler", newCreator);
        main.addDataItem("new_org_code", newOrgCode);
        main.addDataItem("new_org_name", newOrgName);

        iassistService.sendIAssist(main, flowCode);
    }

    /**
     * 构造发送给 i助手的主消息对象，设置流程标识、固定字段，
     * 并将业务主表的所有字段填充进去。
     *
     * @param entity    已持久化的业务记录
     * @param tabName   i助手目标表单名称，同时也是 projectId
     * @param flowCode  流程编号（本方法中仅作占位，后续由 sendIAssist 调用时传入）
     */
    private ITfHelperMain buildIAssistMain(BondsBusiness entity, String tabName,
                                            String flowCode, String operator) {
        ITfHelperMain main = new ITfHelperMain();
        main.setTabName(tabName);
        main.setProjectId(tabName);
        main.setOperateType("btn_commit");
        main.setDstSchema("busi_mobile");
        main.setTriggerWorkflow("true");
        main.setReqNo("");
        main.setOperatePersonnel(operator);
        fillBusinessFields(main, entity, tabName);
        return main;
    }

    /**
     * 安全解码：输入为 null 时返回空字符串，防止 NPE。
     */
    private String safeDecode(String val, java.util.function.Function<String, String> decoder) {
        return val != null ? decoder.apply(val) : "";
    }

    /**
     * 将业务主表的所有字段以 key-value 形式写入 i助手消息体。
     * 字段值为 null 时写入空字符串，保证 i助手侧不会出现 null 展示问题。
     *
     * @param tabName 用于过滤哪些字段不应发送到该流程，避免 i助手收到无关字段引发困惑。
     */
    private void fillBusinessFields(ITfHelperMain main, BondsBusiness entity, String tabName) {
        // ---- 全流程公共字段 ----
        main.addDataItem("bond_code", entity.getBondCode());
        main.addDataItem("biz_uuid", entity.getBizUuid()); // 业务唯一键，审批流以此关联
        main.addDataItem("biz_name", entity.getBizName());
        main.addDataItem("customer_no", entity.getCustomerNo());
        main.addDataItem("customer_name", entity.getCustomerName());
        main.addDataItem("bond_type", safeDecode(entity.getBondType(), Constant.BondTypeEnum::decode));
        main.addDataItem("ecif_customer_no", entity.getEcifCustomerNo());
        main.addDataItem("green_tech_flag", safeDecode(entity.getGreenTechFlag(), Constant.GreenTechFlag::decode));
        main.addDataItem("ext_rating", entity.getExtRating());
        main.addDataItem("ext_rating_date", entity.getExtRatingDate() != null
                ? entity.getExtRatingDate().toString() : "");
        main.addDataItem("rating_agency", entity.getRatingAgency());
        main.addDataItem("int_rating", entity.getIntRating());
        main.addDataItem("int_rating_date", entity.getIntRatingDate() != null
                ? entity.getIntRatingDate().toString() : "");
        main.addDataItem("industry", safeDecode(entity.getIndustry(), Constant.IndustryEnum::decode));
        main.addDataItem("customer_type", safeDecode(entity.getCustomerType(), Constant.CustomerTypeEnum::decode));
        // 新增业务时 biz_type/dept 未知，不发送，待后续补充资料环节再填
        if (!"add_new_business".equals(tabName)) {
            main.addDataItem("biz_type", safeDecode(entity.getBizType(), Constant.BizTypeEnum::decode));
            main.addDataItem("dept", entity.getDept());
        }
        main.addDataItem("start_date", entity.getStartDate() != null
                ? entity.getStartDate().toString() : "");
        main.addDataItem("mature_date", entity.getMatureDate() != null
                ? entity.getMatureDate().toString() : "");

        // 金额三元组
        main.addDataItem("currency", entity.getCurrency());
        main.addDataItem("origin_amount", entity.getOrigAmount() != null
                ? entity.getOrigAmount().toPlainString() : "");
        main.addDataItem("initial_amount", entity.getRmbAmount() != null
                ? entity.getRmbAmount().toPlainString() : "");
        main.addDataItem("balance", entity.getBalance() != null
                ? entity.getBalance().toPlainString() : "");

        main.addDataItem("invest_rate", entity.getInvestRate() != null
                ? entity.getInvestRate().toPlainString() : "");
        main.addDataItem("transfer_rate", entity.getTransferRate() != null
                ? entity.getTransferRate().toPlainString() : "");
        main.addDataItem("guarantee_info", safeDecode(entity.getGuaranteeInfo(), Constant.GuaranteeInfoEnum::decode));
        main.addDataItem("installment_flag", Constant.Bool.decode(entity.getInstallmentFlag()));
        main.addDataItem("our_bank_underwrite", Constant.Bool.decode(entity.getOurBankUnderwrite()));
        main.addDataItem("agreed_usage", entity.getAgreedUsage());
        main.addDataItem("installment_plan", entity.getInstallmentPlan());
        // 主承销商【226006 新增】
        main.addDataItem("lead_underwriter", entity.getLeadUnderwriter() != null ? entity.getLeadUnderwriter() : "");
        main.addDataItem("fund_account_flag", Constant.Bool.decode(entity.getFundAccountFlag()));
        main.addDataItem("fund_account", entity.getFundAccount());
        main.addDataItem("supervise_account_flag", Constant.Bool.decode(entity.getSuperviseAccountFlag()));
        main.addDataItem("supervise_account", entity.getSuperviseAccount());
        main.addDataItem("is_original_am", Constant.Bool.decode(entity.getIsOriginalAm()));
        main.addDataItem("exercise_flag", Constant.Bool.decode(entity.getExerciseFlag()));
        main.addDataItem("exercise_date", entity.getExerciseDate() != null
                ? entity.getExerciseDate().toString() : "");
        main.addDataItem("remark", entity.getRemark());
        main.addDataItem("js_remark", entity.getJsRemark());
        main.addDataItem("inspect_freq", entity.getInspectFreq());
        main.addDataItem("inspector_post", entity.getInspectorPost());
        main.addDataItem("js_remark_flag", Constant.Bool.decode(entity.getJsRemarkFlag()));
        main.addDataItem("org_code", entity.getOrgCode());
        main.addDataItem("org_name", entity.getOrgName());

        // 226006 新增业务：经办人 + org_name + 上存利率相关字段
        if ("add_new_business".equals(tabName)) {
            main.addDataItem("handler", entity.getCreator());
            // 【本次新增】226006 也需要发通道费相关信息给 i助手
            main.addDataItem("remark_number", entity.getRemarkNumber() != null ? entity.getRemarkNumber() : "");
            main.addDataItem("is_passage", Constant.Bool.decode(entity.getIsPassage()));
            main.addDataItem("passage_amount",
                    entity.getPassageAmount() != null ? entity.getPassageAmount().toPlainString() : "");
        }
        // 注意：本流程不发 upper_storage_rate，按业务要求排除

        // ---- 按 tabName 条件发送 ----
        //
        // add_new_business（226006）：
        //   不发：alert_customer / breach_flag / five_level_class / fund_used_up
        //
        // update_business_accountmanager（226007 CM）：
        //   全量发送（包含上面四个字段，另外多发 fund_used_flag / js_remark_flag）
        //
        boolean isAddBusiness = "add_new_business".equals(tabName);
        if (!isAddBusiness) {
            // update_business_accountmanager 及以后扩展用
            main.addDataItem("alert_customer", Constant.Bool.decode(entity.getAlertCustomer()));
            main.addDataItem("breach_flag", Constant.Bool.decode(entity.getBreachFlag()));
            main.addDataItem("five_level_class", entity.getFiveLevelClass());
            main.addDataItem("fund_used_flag", Constant.Bool.decode(entity.getFundUsedFlag()));
            main.addDataItem("fund_used_up", Constant.Bool.decode(entity.getFundUsedUp()));

        }
    }

    /**
     * 将分期计划文本拆分为日期串和金额串。
     *
     * 输入示例："2026-03-09还款25000000元； 2027-03-09还款25000000元"
     * 输出：String[]{ "2026-03-09,2027-03-09", "25000000.00,25000000.00" }
     *
     * @see plan-20260622-installment-plan TC-1~TC-10
     */
    private String[] parseInstallmentPlan(String raw) {
        if (!StringUtils.hasText(raw)) {
            return new String[] { "", "" };
        }

        java.util.List<String> dates = new java.util.ArrayList<>();
        java.util.List<String> amounts = new java.util.ArrayList<>();

        // 按 "；" 或 ";" 分割各期（兼容半角分号）
        String[] segments = raw.split("[；;]");
        for (String seg : segments) {
            String trimmed = seg.trim();
            if (trimmed.isEmpty()) continue;

            // 提取日期：匹配 YYYY-MM-DD 或 YYYY/MM/DD
            java.util.regex.Matcher dateMatcher = java.util.regex.Pattern.compile(
                    "(\\d{4}[-/]\\d{1,2}[-/]\\d{1,2})"
            ).matcher(trimmed);
            if (dateMatcher.find()) {
                // 统一转换为横线
                dates.add(dateMatcher.group(1).replace('/', '-'));
            }

            // 提取金额：匹配 "还款" 之后的纯数字（支持千分位逗号）
            java.util.regex.Matcher amountMatcher = java.util.regex.Pattern.compile(
                    "(?:还款|还)\\s*([\\d,]+\\.?\\d*)元?"
            ).matcher(trimmed);
            if (amountMatcher.find()) {
                String amountRaw = amountMatcher.group(1).replace(",", "");
                try {
                    java.math.BigDecimal bd = new java.math.BigDecimal(amountRaw);
                    amounts.add(bd.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString());
                } catch (NumberFormatException e) {
                    log.warn("[parseInstallmentPlan] 无法解析金额 '{}'，跳过该期", amountRaw);
                }
            }
        }

        if (dates.size() != amounts.size()) {
            log.warn("[parseInstallmentPlan] 分期计划解析异常：日期数={}，金额数={}，原始文本={}",
                    dates.size(), amounts.size(), raw);
        }

        String dateStr = String.join(",", dates);
        String amountStr = String.join(",", amounts);

        return new String[] { dateStr, amountStr };
    }

    // ===== 226007 精简报文相关方法 =====

    /**
     * 深拷贝老记录，防止被后续 merge 影响。
     */
    private BondsBusiness cloneAsIs(BondsBusiness src) {
        BondsBusiness copy = new BondsBusiness();
        BeanUtils.copyProperties(src, copy);
        return copy;
    }

    /**
     * 比对老记录和新 DTO，返回形如 "ecif客户号由AAA变为BBB;客户编号由CCC变为DDD" 的变更轨迹。
     * 仅监控白名单内的字段，空值和相同值均不输出。
     *
     * @param oldBiz       老业务记录
     * @param newDto       新 DTO
     * @param extraChanges 额外的变更项（如还款计划变更）
     * @return 变更轨迹字符串，多个变更用分号分隔
     */
    private String buildUpdateContext(BondsBusiness oldBiz, BondBusinessSaveDTO newDto,
                                        List<String> extraChanges) {
        List<String> changes = new ArrayList<>();

        // 使用反射遍历白名单，生成用户友好的变更轨迹
        // 【重要】先解码再比较，确保编码值和中文值能被正确识别为同一内容
        for (FieldPair fp : UPDATE_CONTEXT_FIELD_PAIRS) {
            Object rawOld = getFieldValue(oldBiz, fp.beanProp());
            Object rawNew = getFieldValue(newDto, fp.beanProp());

            // 先将两端都解码为统一的展示格式，再用解码后的值进行比较
            String decodedOld = decodeForContext(fp.fieldNameCn(), rawOld);
            String decodedNew = decodeForContext(fp.fieldNameCn(), rawNew);

            // 只要有一方有值且双方不相等，就记录变更（支持清空和有值的场景）
            boolean oldHasValue = decodedOld != null && !decodedOld.isEmpty();
            boolean newHasValue = decodedNew != null && !decodedNew.isEmpty();
            if ((oldHasValue || newHasValue) && !Objects.equals(decodedOld, decodedNew)) {
                changes.add(fp.fieldNameCn() + "由" + (oldHasValue ? decodedOld : "") + "变为" + (newHasValue ? decodedNew : "空"));
            }
        }

        // 追加额外变更项
        if (extraChanges != null && !extraChanges.isEmpty()) {
            changes.addAll(extraChanges);
        }

        return String.join(";", changes);
    }

    /**
     * 将还款明细表还原为前端友好的展示文本，用于 update_context 中的变更描述。
     * 输出示例："第1期 2026-07-31 还款50000元； 第2期 2026-08-31 还款80000元"
     */
    private String buildInstallmentPlanText(List<RepaymentSchedule> schedules) {
        if (schedules == null || schedules.isEmpty()) return "";
        return schedules.stream()
                .map(r -> "第" + r.getSort() + "期 "
                        + r.getRepaymentDate() + " "
                        + "还款" + r.getRepaymentAmount().stripTrailingZeros().toPlainString() + "元")
                .collect(Collectors.joining("；"));
    }

    /**
     * 将前端正来的结构化列表还原为展示文本（用于比对）。
     */
    private String buildInstallmentPlanTextFromItems(List<InstallmentPlanItem> items) {
        if (items == null || items.isEmpty()) return "";
        return items.stream()
                .map(it -> "第" + it.getSort() + "期 "
                        + it.getPlanTime() + " "
                        + "还款" + it.getAmount().stripTrailingZeros().toPlainString() + "元")
                .collect(Collectors.joining("；"));
    }

    /**
     * 226007 专用发送方法（不走 fillBusinessFields，走精简9字段模式）。
     *
     * @param entity        已持久化的业务记录
     * @param tabName       i助手物理表名，如 "update_business_accountmanager"
     * @param flowCode      审计用流程编号，如 "flow_002"
     * @param updaterType   发起角色："0"=客户经理，"1"=业务管理员
     * @param operator      操作人 OA 工号
     * @param updateContext 变更轨迹，由 buildUpdateContext() 生成
     */
    private void sendIAssist226007(BondsBusiness entity, String tabName,
                                     String flowCode, String updaterType,
                                     String operator, String updateContext) {
        ITfHelperMain main = new ITfHelperMain();
        main.setTabName(tabName);
        main.setProjectId(tabName);
        main.setOperateType("btn_commit");
        main.setDstSchema("busi_mobile");
        main.setTriggerWorkflow("true");
        main.setReqNo("");
        main.setOperatePersonnel(operator);

        // ---- 精简要发到 i助手的9个固定字段 ----
        main.addDataItem("bond_code", entity.getBondCode());
        main.addDataItem("update_context", updateContext);
        main.addDataItem("updator", operator);
        main.addDataItem("updator_type", updaterType);
        main.addDataItem("updator_org_code", entity.getOrgCode());
        main.addDataItem("updator_org_name", entity.getOrgName());
        main.addDataItem("apply_type", "1");
        main.addDataItem("apply_date", LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));
        main.addDataItem("ybid", ""); // 占位，sendIAssist 会替换

        iassistService.sendIAssist(main, flowCode);
    }

    // ===== 辅助方法 =====

    /** 空值安全处理 */
    private String nullSafe(String val) {
        return val != null ? val : "";
    }

    /**
     * 通过反射获取对象的属性值。
     */
    private Object getFieldValue(Object obj, String propName) {
        if (obj == null || propName == null) return null;
        try {
            String getterName = "get" + Character.toUpperCase(propName.charAt(0)) + propName.substring(1);
            Method method = obj.getClass().getMethod(getterName);
            return method.invoke(obj);
        } catch (Exception e) {
            log.trace("[getFieldValue] 获取属性失败: {}.{}", obj.getClass().getSimpleName(), propName);
            return null;
        }
    }

    /**
     * 格式化显示值，处理不同类型的值。
     */
    private String formatForDisplay(String chineseLabel, Object value) {
        if (value == null) return "(空)";
        if (value instanceof LocalDate ld) return ld.toString();
        if (value instanceof BigDecimal bd) return bd.stripTrailingZeros().toPlainString();
        return value.toString();
    }

    /**
     * 根据字段名选择对应的解码器，将枚举编码转为用户友好的中文显示值。
     * 非枚举字段（金额、日期、文本）或无法解码时返回原始值的字符串表示。
     *
     * @param fieldNameCn 中文字段名，用于判断字段类型
     * @param value       原始值（可能是 String/Integer/BigDecimal/LocalDate 等）
     * @return 解码后的中文显示值，null 或空值返回空字符串
     */
    private String decodeForContext(String fieldNameCn, Object value) {
        if (value == null) return "";

        // 通用类型格式化（日期、金额的直接返回其字符串形式）
        if (value instanceof LocalDate ld) return ld.toString();
        if (value instanceof BigDecimal bd) return bd.stripTrailingZeros().toPlainString();

        // 【增强】兜底处理：尝试将字符串解析为 LocalDate，保证格式一致性
        // 防止 Jackson 未正确反序列化时（如字段名差异），仍能正确比对
        String strVal = value.toString();
        if (isDateString(strVal)) {
            try {
                return LocalDate.parse(strVal).toString();
            } catch (DateTimeParseException ignored) {
                // 解析失败，返回原字符串
            }
        }

        // 根据字段名应用对应的解码器
        String decoded = switch (fieldNameCn) {
            case "标债类型" -> Constant.BondTypeEnum.decode(strVal);
            case "绿色科技标识" -> Constant.GreenTechFlag.decode(strVal);
            case "业务品种" -> Constant.BizTypeEnum.decode(strVal);
            case "行业分类" -> Constant.IndustryEnum.decode(strVal);
            case "客户分类" -> Constant.CustomerTypeEnum.decode(strVal);
            case "担保情况" -> Constant.GuaranteeInfoEnum.decode(strVal);
            case "分期还款", "预警客户", "我行承销",
                 "是否原资管部回表", "是否行权", "是否有通道费",
                 "资金账户标记", "监管账户标记",
                 "违约标识", "是否有金融市场部批复管理要求", "我行监管资金是否已使用完毕" -> Constant.Bool.decode(strVal);
            case "币种" -> strVal;  // 币种直接显示，不解码
            default -> strVal;      // 其余字段原样显示
        };

        // 如果解码后仍是原来的编码（解码失败），直接返回原值
        return decoded;
    }

    /**
     * 判断字符串是否符合日期格式（yyyy-MM-dd），用于兜底解析未被正确反序列化的日期字段。
     * <p>覆盖以下常见格式变体：
     * <ul>
     *   <li>2026-07-01</li>
     *   <li>2026/07/01</li>
     *   <li>20260701</li>
     * </ul>
     */
    private static boolean isDateString(String str) {
        if (str == null || str.length() < 8) return false;
        // 检查是否是数字为主的日期串，如 2026-07-01 或 20260701
        return str.matches("\\d{4}[-/]?\\d{2}[-/]?\\d{2}");
    }

    /**
     * update_context 白名单：（中文字段名 → JavaBean 属性名）
     */
    private static final List<FieldPair> UPDATE_CONTEXT_FIELD_PAIRS = List.of(
            new FieldPair("ecif客户号", "ecifCustomerNo"),
            new FieldPair("客户编号", "customerNo"),
            new FieldPair("客户名称", "customerName"),
            new FieldPair("债券名称", "bizName"),
            new FieldPair("标债类型", "bondType"),
            new FieldPair("绿色科技标识", "greenTechFlag"),
            new FieldPair("业务品种", "bizType"),
            new FieldPair("外部评级", "extRating"),
            new FieldPair("外评日期", "extRatingDate"),    // 【补全】外部信用评级日期
            new FieldPair("评级机构", "ratingAgency"),
            new FieldPair("内部评级", "intRating"),
            new FieldPair("内评日期", "intRatingDate"),     // 【补全】内部评级日期
            new FieldPair("行业分类", "industry"),
            new FieldPair("客户分类", "customerType"),
            new FieldPair("预警客户", "alertCustomer"),
            new FieldPair("发放日", "startDate"),
            new FieldPair("到期日", "matureDate"),
            new FieldPair("币种", "currency"),
            new FieldPair("初始金额（原币）", "origAmount"),
            new FieldPair("初始金额（折人民币）", "rmbAmount"),
            new FieldPair("业务余额", "balance"),
            new FieldPair("投资利率", "investRate"),
            new FieldPair("转让利率", "transferRate"),
            new FieldPair("担保情况", "guaranteeInfo"),
            new FieldPair("分期还款", "installmentFlag"),
            new FieldPair("我行承销", "ourBankUnderwrite"),
            new FieldPair("主承销商", "leadUnderwriter"),
            new FieldPair("约定资金用途", "agreedUsage"),
            new FieldPair("资金账户", "fundAccount"),
            new FieldPair("监管账户", "superviseAccount"),
            new FieldPair("是否原资管部回表", "isOriginalAm"),
            new FieldPair("是否行权", "exerciseFlag"),
            new FieldPair("行权日期", "exerciseDate"),
            new FieldPair("批复号", "remarkNumber"),
            new FieldPair("是否有通道费", "isPassage"),
            new FieldPair("通道费金额", "passageAmount"),
            new FieldPair("上存利率", "upperStorageRate"),
            new FieldPair("金融市场部批复管理要求", "jsRemark"),
            new FieldPair("是否有金融市场部批复管理要求", "jsRemarkFlag"),
            new FieldPair("检查频率", "inspectFreq"),
            new FieldPair("检查岗位", "inspectorPost"),
            new FieldPair("资金账户标记", "fundAccountFlag"),
            new FieldPair("监管账户标记", "superviseAccountFlag"),
            new FieldPair("违约标识", "breachFlag"),
            new FieldPair("五级分类", "fiveLevelClass"),
            new FieldPair("批复管理要求", "remark"),
            new FieldPair("管理条线", "manageLine"),
            new FieldPair("我行监管资金是否已使用完毕", "fundUsedUp")
    );

    /**
     * 白名单字段对：（中文字段名 ↔ JavaBean 属性名）
     */
    private record FieldPair(String fieldNameCn, String beanProp) {}

    // ===== 226006 新增业务必填字段校验 =====

    /**
     * 226006 新增业务时，以下43个字段强制非空，任一缺失则拒绝提交。
     *
     * @see work/plans/2026-06-29-upper-storage-rate-auto-calc.md §F.1
     */
    private static final Set<String> REQUIRED_FOR_NEW_BUSINESS = Set.of(
            "bondCode", "ecifCustomerNo", "customerNo", "customerName",
            "bizName", "bondType", "greenTechFlag", "extRating", "extRatingDate",
            "ratingAgency", "intRating", "intRatingDate", "industry", "customerType",
            "startDate", "matureDate", "currency", "origAmount", "rmbAmount", "balance",
            "investRate", "transferRate", "guaranteeInfo", "installmentFlag", "ourBankUnderwrite", "agreedUsage",
            "fundAccountFlag", "superviseAccountFlag",
            "exerciseFlag", "remarkNumber",
            "remark", "jsRemarkFlag", "leadUnderwriter"
    );

    /**
     * 校验新增业务的必填字段，白名单内任一为空则抛 BusiException。
     *
     * @param dto 前端传入的 DTO
     */
    private void validateMandatoryFieldsForNewBusiness(BondBusinessSaveDTO dto) {
        String chineseLabels = "bondCode->债券编号,ecifCustomerNo->ECIF客户号,customerNo->客户编号,customerName->客户名称,bizName->债券名称,bondType->标债类型,greenTechFlag->绿色科技标识,extRating->外部评级,extRatingDate->外评日期,ratingAgency->评级机构,intRating->内部评级,intRatingDate->内评日期,industry->行业分类,customerType->客户分类,startDate->发放日,matureDate->到期日,currency->币种,origAmount->初始金额（原币）,rmbAmount->初始金额（折人民币）,balance->业务余额,investRate->投资利率,transferRate->转让利率,guaranteeInfo->担保情况,installmentFlag->分期标志,ourBankUnderwrite->我行承销,agreedUsage->约定资金用途,fundAccount->资金账户,fundAccountFlag->资金账户标记,superviseAccount->监管账户,superviseAccountFlag->监管账户标记,drawdownCheck->支用检查,exerciseFlag->行权标志,exerciseDate->行权日期,remarkNumber->批复号,remark->批复管理要求,jsRemark->市场部批复,jsRemarkFlag->市场部批复标记,leadUnderwriter->主承销商,isOriginalAm->是否原资管部回表,fiveLevelClass->五级分类,alertCustomer->预警客户,fundUsedUp->监管资金使用完毕";

        for (String prop : REQUIRED_FOR_NEW_BUSINESS) {
            if (isEmpty(getFieldValue(dto, prop))) {
                String cnLabel = Arrays.stream(chineseLabels.split(","))
                        .map(s -> s.split("->"))
                        .filter(parts -> parts.length == 2 && parts[0].equals(prop))
                        .findFirst()
                        .map(parts -> parts[1])
                        .orElse(prop);
                throw new BusiException(cnLabel + "不能为空");
            }
        }

        // 【联动校验】flag 为"1"时，相关联字段不能为空
        if ("1".equals(dto.getInstallmentFlag()) && isEmpty(dto.getInstallment())) {
            throw new BusiException("分期还款计划不能为空");
        }
        if ("1".equals(dto.getFundAccountFlag()) && isEmpty(dto.getFundAccount())) {
            throw new BusiException("资金账户不能为空");
        }
        if ("1".equals(dto.getSuperviseAccountFlag()) && isEmpty(dto.getSuperviseAccount())) {
            throw new BusiException("监管账户不能为空");
        }
        if ("1".equals(dto.getJsRemarkFlag()) && isEmpty(dto.getJsRemark())) {
            throw new BusiException("金融市场部批复不能为空");
        }
        if ("1".equals(dto.getExerciseFlag()) && isEmpty(dto.getExerciseDate())) {
            throw new BusiException("行权日期不能为空");
        }
    }

    /** 判断值是否为空（null 或空白字符串） */
    private boolean isEmpty(Object value) {
        if (value == null) return true;
        if (value instanceof String s) return s.isBlank();
        return false;
    }

    // ===== 226007 修改业务必填字段校验 =====

    /**
     * 226007 修改业务时，以下49个字段强制非空，任一缺失则拒绝提交。
     *
     * @see work/plans/2026-06-29-upper-storage-rate-auto-calc.md §F.2
     */
    private static final Set<String> REQUIRED_FOR_UPDATE_BUSINESS = Set.of(
            "bondCode", "ecifCustomerNo", "customerNo", "customerName",
            "bizName", "bondType", "greenTechFlag", "extRating", "extRatingDate",
            "ratingAgency", "intRating", "intRatingDate",
            "leadUnderwriter","isPassage","upperStorageRate","alertCustomer","bizType","remarkNumber",
            "industry", "customerType",
            "startDate", "matureDate", "currency", "origAmount", "rmbAmount", "balance",
            "investRate", "transferRate", "guaranteeInfo", "breachFlag", "fiveLevelClass",
            "fundUsedFlag", "fundUsedUp", "installmentFlag",
            "ourBankUnderwrite", "manageLine", "dept", "agreedUsage",
            "fundAccountFlag", "superviseAccountFlag",
//            "drawdownCheck",
            "isOriginalAm", "exerciseFlag",
            "remark", "jsRemarkFlag", "inspectFreq", "inspectorPost"
    );

    /**
     * 校验修改业务的必填字段，白名单内任一为空则抛 BusiException。
     *
     * @param dto 前端传入的 DTO
     */
    private void validateMandatoryFieldsForUpdateBusiness(BondBusinessSaveDTO dto) {
        String chineseLabels = "leadUnderwriter->主承销商,isPassage->是否有通道费,upperStorageRate->上存利率,alertCustomer->是否我行预警客户,bisType->业务品种,remarkNumber->批复号,bondCode->债券编号,ecifCustomerNo->ECIF客户号,customerNo->客户编号,customerName->客户名称,bizName->债券名称,bondType->标债类型,greenTechFlag->绿色科技标识,extRating->外部评级,extRatingDate->外评日期,ratingAgency->评级机构,intRating->内部评级,intRatingDate->内评日期,industry->行业分类,customerType->客户分类,startDate->发放日,matureDate->到期日,currency->币种,origAmount->初始金额（原币）,rmbAmount->初始金额（折人民币）,balance->业务余额,investRate->投资利率,transferRate->转让利率,guaranteeInfo->担保情况,breachFlag->违约标志,fiveLevelClass->五级分类,fundUsedFlag->资金监管标志,fundUsedUp->监管资金使用完毕,installmentFlag->分期标志,installmentPlan->分期计划,ourBankUnderwrite->我行承销,manageLine->管理条线,dept->对应处室,agreedUsage->约定资金用途,fundAccount->资金账户,fundAccountFlag->资金账户标记,superviseAccount->监管账户,superviseAccountFlag->监管账户标记,drawdownCheck->支用检查,isOriginalAm->是否原资管部回表,exerciseFlag->行权标志,exerciseDate->行权日期,remark->批复管理要求,jsRemark->市场部批复,jsRemarkFlag->市场部批复标记,inspectFreq->检查频率,inspectorPost->检查岗位";

        for (String prop : REQUIRED_FOR_UPDATE_BUSINESS) {
            if (isEmpty(getFieldValue(dto, prop))) {
                String cnLabel = Arrays.stream(chineseLabels.split(","))
                        .map(s -> s.split("->"))
                        .filter(parts -> parts.length == 2 && parts[0].equals(prop))
                        .findFirst()
                        .map(parts -> parts[1])
                        .orElse(prop);
                throw new BusiException(cnLabel + "不能为空");
            }
        }

        // 【联动校验】flag 为"1"时，相关联字段不能为空
        if ("1".equals(dto.getIsPassage()) && isEmpty(dto.getPassageAmount())) {
            throw new BusiException("通道费金额不能为空");
        }
        if ("1".equals(dto.getInstallmentFlag()) && isEmpty(dto.getInstallment())) {
            throw new BusiException("分期还款计划不能为空");
        }
        if ("1".equals(dto.getFundAccountFlag()) && isEmpty(dto.getFundAccount())) {
            throw new BusiException("资金账户不能为空");
        }
        if ("1".equals(dto.getSuperviseAccountFlag()) && isEmpty(dto.getSuperviseAccount())) {
            throw new BusiException("监管账户不能为空");
        }
        if ("1".equals(dto.getJsRemarkFlag()) && isEmpty(dto.getJsRemark())) {
            throw new BusiException("金融市场部批复不能为空");
        }
        if ("1".equals(dto.getExerciseFlag()) && isEmpty(dto.getExerciseDate())) {
            throw new BusiException("行权日期不能为空");
        }
    }

    @Override
    public BondsBusiness getByBondCodeAndStatus(String bondCode, Integer status) {
        return lambdaQuery()
                .eq(BondsBusiness::getBondCode, bondCode)
                .eq(BondsBusiness::getStatus, status)
                .one();
    }

    /**
     * 自动填充缺失的 sort 字段，按数组顺序生成第1期、第2期...
     *
     * @param items 前端传来的还款计划列表（可能缺少 sort）
     * @return 填充后的列表，若输入为 null 则返回空列表
     */
    private List<InstallmentPlanItem> fillMissingSort(List<InstallmentPlanItem> items) {
        if (items == null || items.isEmpty()) {
            return Collections.emptyList();
        }
        AtomicInteger counter = new AtomicInteger(0);
        return items.stream()
                .map(it -> {
                    InstallmentPlanItem copy = new InstallmentPlanItem();
                    copy.setSort(it.getSort() != null ? it.getSort() : counter.incrementAndGet());
                    copy.setAmount(it.getAmount());
                    copy.setPlanTime(it.getPlanTime());
                    return copy;
                })
                .toList();
    }
}