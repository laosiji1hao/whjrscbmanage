package com.hxb.iibs.wuhan.mapper;

import com.baomidou.dynamic.datasource.annotation.DS;
import com.hxb.iibs.wuhan.entity.ext.AssistedHandlerChangeVO;
import com.hxb.iibs.wuhan.entity.ext.AssistedUpdateVO;
import com.hxb.iibs.wuhan.entity.ext.IAssistFullReturnVO;
import com.hxb.iibs.wuhan.entity.ext.TerminateApprovalVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * i助手审批结果查询。
 * <ul>
 *   <li>iassist_flow_data 在 master 库（whjrscbmanage）</li>
 *   <li>add_new_business / update_business_accountmanager / update_business_handler_accountmanager 在 busiMobile 库</li>
 * </ul>
 * 两边分开查，用 ybid 列表做桥梁，避免跨库 JOIN。
 */
@Mapper
public interface IAssistedApprovalMapper {

    // ============================================================
    // master 库：查待审批的 ybid 列表
    // ============================================================

    /**
     * 从 master 库（whjrscbmanage.iassist_flow_data）取出待处理（approval_status=0）的 ybid 列表。
     * 最大一次取 500 条，超出部分下次调度再处理。
     */
    @DS("master")
    @Select("""
            SELECT id
            FROM iassist_flow_data
            WHERE approval_status = 0
            ORDER BY id ASC
            LIMIT #{limit}
            """)
    List<Long> listPendingYbidsFromMaster(@Param("limit") Integer limit);

    // ============================================================
    // busiMobile 库：三张业务表，只按 ybid 精确匹配
    // ============================================================

    /**
     * 226006 新增业务：全量字段回传，用于构建完整记录写入本地 DB。
     *
     * <p>i助手在审批通过后会返回完整的业务数据，我们用这些数据构建全新的 BondsBusiness 记录。
     *
     * @param ybids 从 master 库查出的待审批 ybid 列表，空列表返回空数组
     */
    @DS("busiMobile")
    @Select("<script>" +
            "SELECT t.ybid                                      AS ybid, " +
            "       t.bond_code                                AS bondCode, " +
            "       t.bond_Type                                AS bondType, " +
            "       t.approve_status                          AS approveStatus, " +
            "       t.remark                                   AS remark, " +
            // 基本信息
            "       t.biz_name                                 AS bizName, " +
            "       t.customer_no                              AS customerNo, " +
            "       t.customer_name                           AS customerName, " +
            "       t.ecif_customer_no                        AS ecifCustomerNo, " +
            "       t.green_tech_flag                         AS greenTechFlag, " +
            // 评级信息
            "       t.ext_rating                               AS extRating, " +
            "       t.ext_rating_date                          AS extRatingDate, " +
            "       t.rating_agency                           AS ratingAgency, " +
            "       t.int_rating                               AS intRating, " +
            "       t.int_rating_date                         AS intRatingDate, " +
            // 客户分类
            "       t.industry                                 AS industry, " +
            "       t.customer_type                           AS customerType, " +
            // 时间与金额
            "       t.start_date                               AS startDate, " +
            "       t.mature_date                             AS matureDate, " +
            "       t.currency                                 AS currency, " +
            "       t.origin_amount                           AS originAmount, " +
            "       t.initial_amount                          AS initialAmount, " +
            "       t.balance                                  AS balance, " +
            "       t.invest_rate                             AS investRate, " +
            "       t.transfer_rate                           AS transferRate, " +
            // 风控与担保
            "       t.guarantee_info                          AS guaranteeInfo, " +
            "       t.installment_flag                        AS installmentFlag, " +
            "       t.our_bank_underwrite                     AS ourBankUnderwrite, " +
            "       t.agreed_usage                            AS agreedUsage, " +
            "       t.installment_plan                        AS installmentPlan, " +
            "       t.lead_underwriter                        AS leadUnderwriter, " +
            "       t.fund_account_flag                       AS fundAccountFlag, " +
            "       t.fund_account                            AS fundAccount, " +
            "       t.supervise_account_flag                  AS superviseAccountFlag, " +
            "       t.supervise_account                       AS superviseAccount, " +
            "       t.is_original_am                          AS isOriginalAm, " +
            "       t.exercise_flag                           AS exerciseFlag, " +
            "       t.exercise_date                           AS exerciseDate, " +
            // 其他
            "       t.remark_number                           AS remarkNumber, " +
            "       t.js_remark                               AS jsRemark, " +
            "       t.js_remark_flag                          AS jsRemarkFlag, " +
            "       t.inspect_freq                            AS inspectFreq, " +
            "       t.inspector_post                          AS inspectorPost, " +
            // i助手特有字段（重点回写）
            "       t.biz_type                                 AS bizType, " +
            "       t.dept                                     AS dept, " +
            "       COALESCE(t.is_passage, '0')                  AS isPassage, " +
            "       t.passage_amount                           AS passageAmount, " +
            // 经办人
            "       t.handler                                  AS handler, " +
            "       t.org_name                                 AS orgName, " +
            "       t.org_code                                 AS orgCode " +
            "FROM add_new_business t " +
            "WHERE t.ybid IN " +
            "<foreach collection='ybids' item='ybid' open='(' separator=',' close=')'>" +
            "  #{ybid}" +
            "</foreach>" +
            "  AND t.approve_status IS NOT NULL AND t.approve_status != '' " +
            "ORDER BY t.ybid ASC " +
            "</script>")
    List<IAssistFullReturnVO> listNewBusinessApprovals(@Param("ybids") List<Long> ybids);

    /**
     * 226007 修改业务：【本次改造】原来是全量字段同步，现改为只同步 update_context 变更轨迹。
     * 由 applyUpdateContext() 解析 update_context 字符串，逐字段回填主表。
     *
     * @param ybids 从 master 库查出的待审批 ybid 列表，空列表返回空数组
     */
    @DS("busiMobile")
    @Select("<script>" +
            "SELECT " +
            "    t.ybid                                        AS ybid, " +
            "    t.bond_code                                  AS bondCode, " +
            "    t.approve_status                             AS approveStatus, " +
            // 【本次改造】核心变更轨迹字段
            "    t.update_context                             AS updateContext, " +
            // 变更人和机构信息（用于历史追溯）
            "    t.updator                                    AS creator, " +
            "    t.updator_org_code                           AS orgCode, " +
            "    t.updator_org_name                           AS orgName " +
            "FROM update_business_accountmanager t " +
            "WHERE t.ybid IN " +
            "<foreach collection='ybids' item='ybid' open='(' separator=',' close=')'>" +
            "  #{ybid}" +
            "</foreach>" +
            "  AND t.approve_status IS NOT NULL AND t.approve_status != '' " +
            "ORDER BY t.ybid ASC " +
            "</script>")
    List<AssistedUpdateVO> listUpdateBusinessApprovals(@Param("ybids") List<Long> ybids);

    /**
     * 226008 变更客户经理（两路共用一张表，按 updater_type 区分）。
     * 所有旧新变更字段均从 i助手侧拉回，定时任务据此写历史表和主表。
     *
     * @param ybids 从 master 库查出的待审批 ybid 列表，空列表返回空数组
     */
    @DS("busiMobile")
    @Select("<script>" +
            "SELECT t.ybid                 AS ybid, " +
            "       t.bond_code           AS bondCode, " +
            "       t.updator_type        AS updaterType, " +
            "       t.old_handler         AS oldHandler, " +
            "       t.old_org_code        AS oldOrgCode, " +
            "       t.old_org_name        AS oldOrgName, " +
            "       t.new_handler         AS newHandler, " +
            "       t.new_org_code        AS newOrgCode, " +
            "       t.new_org_name        AS newOrgName, " +
            "       t.approve_status      AS approveStatus, " +
            "       t.approve_info        AS remark " +
            "FROM update_business_handler_accountmanager t " +
            "WHERE t.ybid IN " +
            "<foreach collection='ybids' item='ybid' open='(' separator=',' close=')'>" +
            "  #{ybid}" +
            "</foreach>" +
            "  AND t.approve_status IS NOT NULL AND t.approve_status != '' " +
            "ORDER BY t.ybid ASC " +
            "</script>")
    List<AssistedHandlerChangeVO> listHandlerChangeApprovals(@Param("ybids") List<Long> ybids);

    /**
     * 226009 中止业务：从 terminate_business 表拉取审批结论。
     *
     * @param ybids 从 master 库查出的待审批 ybid 列表，空列表返回空数组
     */
    @DS("busiMobile")
    @Select("<script>" +
            "SELECT t.ybid              AS ybid, " +
            "       t.bond_code         AS bondCode, " +
            "       t.approve_status    AS approveStatus " +
            "FROM terminate_business t " +
            "WHERE t.ybid IN " +
            "<foreach collection='ybids' item='ybid' open='(' separator=',' close=')'>" +
            "  #{ybid}" +
            "</foreach>" +
            "  AND t.approve_status IS NOT NULL AND t.approve_status != '' " +
            "ORDER BY t.ybid ASC " +
            "</script>")
    List<TerminateApprovalVO> listTerminateApprovals(@Param("ybids") List<Long> ybids);
}