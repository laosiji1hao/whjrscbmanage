package com.hxb.iibs.wuhan.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.hxb.iibs.wuhan.dto.AccountStatusVO;
import com.hxb.iibs.wuhan.dto.BondBusinessQueryReq;
import com.hxb.iibs.wuhan.dto.BondBusinessSaveDTO;
import com.hxb.iibs.wuhan.entity.BondsBusiness;

import java.util.Map;

public interface IBondsBusinessService extends IService<BondsBusiness> {
    void saveBusiness(BondBusinessSaveDTO dto);
    void changeManager(String id, String newCreator, String newOrgCode,
                       String newOrgName, String updatorType, String operator);
    /**
     * 根据债券编号中止业务，同时同步到 i助手。
     *
     * @param bondCode    债券编号（必填，唯一定位业务记录）
     * @param terminator  操作人 OA 工号
     * @param updaterType 变更人类型："0"=客户经理，"1"=业务管理员
     */
    void terminateByBondCode(String bondCode, String terminator, String updaterType);
    /**
     * 按业务唯一键(biz_uuid)中止业务（226009 前端已改传 businessId=biz_uuid）。
     */
    void terminateByBizUuid(String bizUuid, String terminator, String updaterType);
    IPage<BondsBusiness> queryPage(BondBusinessQueryReq req);

    /**
     * 修改业务，根据 updatorType 选对应审批流。
     *
     * @param id           业务记录主键
     * @param dto          修改后的业务字段
     * @param updatorType  发起角色："0"=客户经理，"1"=业务管理员
     */
    void updateBusiness(String id, BondBusinessSaveDTO dto, String updatorType);

    /**
     * 根据客户编号查询 ECIF 客户号和客户名称，供帆软报表自动填充。
     *
     * <ol>
     *   <li>调用数据工厂 cms_no_td_info，参数 cms_host_no → 获取 cb_host_no（ECIF客户号）</li>
     *   <li>若获取到 ECIF 客户号，调用总行公共服务 200328 获取客户名称</li>
     * </ol>
     *
     * @param custNo 客户编号
     * @return 结果集，含 ecifCustomerNo 和 customerName，任一步骤失败对应字段为空字符串
     */
    Map<String, String> getCustomerInfoByCustNo(String custNo);

    /**
     * 查询账户状态。
     *
     * <p>接口名：22600A — 查询账户状态
     * 调用路径：POST /flowservice/json/flow_{prjId}_22600A
     * 请求体：{ iibs: { req: { body: { acctNo: "11159000000417830" } } } }
     * 响应：{ iibs: { resp: { head: ..., body: AccountStatusVO } } }
     *
     * @param acctNo 账号
     * @return 账户信息（只包含核心字段，降低泄漏面）
     * @throws com.hxb.iibs.wuhan.exception.BusiException 账号不可用时抛出，消息为 statusTxt
     */
    AccountStatusVO queryAccountStatus(String acctNo);

    /**
     * 根据债券编号和状态查询业务记录。
     *
     * @param bondCode 债券编号
     * @param status   业务状态
     * @return 符合条件的业务记录，未找到返回 null
     */
    BondsBusiness getByBondCodeAndStatus(String bondCode, Integer status);
}