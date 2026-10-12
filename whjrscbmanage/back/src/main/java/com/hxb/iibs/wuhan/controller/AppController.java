package com.hxb.iibs.wuhan.controller;

import com.alibaba.fastjson2.JSONObject;
import com.alibaba.fastjson2.JSONPath;
import com.hxb.iibs.wuhan.api.ICommonApi;
import com.hxb.iibs.wuhan.api.IFstoreApi;
import com.hxb.iibs.wuhan.api.IGxpApi;
import com.hxb.iibs.wuhan.dto.AccountStatusVO;
import com.hxb.iibs.wuhan.dto.BondBusinessSaveDTO;
import com.hxb.iibs.wuhan.dto.EcifQueryDTO;
import com.hxb.iibs.wuhan.dto.ManagerChangeDTO;
import com.hxb.iibs.wuhan.dto.TerminateDTO;
import com.hxb.iibs.wuhan.entity.ResponseWrapper;
import com.hxb.iibs.wuhan.entity.XxlJobGroup;
import com.hxb.iibs.wuhan.exception.BusiException;
import com.hxb.iibs.wuhan.job.CommonJob;
import com.hxb.iibs.wuhan.service.IBondsBusinessService;
import com.hxb.iibs.wuhan.service.IXxlJobGroupService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/flowservice/json")
public class AppController {

    @Autowired
    private IXxlJobGroupService xxlJobGroupService;
    @Autowired
    private IBondsBusinessService bondsBusinessService;
    @Autowired
    private ICommonApi commonApi;
    @Autowired
    private IGxpApi gxpApi;
    @Autowired
    private IFstoreApi fstoreApi;
    @Autowired
    private CommonJob job;

    /**
     * 测试可访问
     */
    @RequestMapping("flow_demo_000001")
    public ResponseWrapper<String> demo(@RequestBody String json) {
        return new ResponseWrapper<>(json);
    }

    /**
     * 测试可访问
     */
    @RequestMapping("flow_${prj.id}_000001")
    public ResponseWrapper<String> test(@RequestBody String json) {
        return new ResponseWrapper<>(json);
    }

    /**
     * 测试基础功能，多数据源
     */
    @RequestMapping("flow_${prj.id}_226001")
    public ResponseWrapper<List<XxlJobGroup>> testDs(@RequestBody String json) {
        JSONObject jsonObject = (JSONObject) JSONPath.extract(json, "$.iibs.req.body");
        log.info("请求报文: {}", jsonObject);

        return new ResponseWrapper<>(xxlJobGroupService.list());
    }

    /**
     * 测试异常处理
     */
    @RequestMapping("flow_${prj.id}_226002")
    public ResponseWrapper<?> testException(@RequestBody String json) {
        if (true)
            throw new BusiException("测试跑出异常");

        return new ResponseWrapper<>();
    }

    /**
     * 测试调用公共服务 api
     */
    @RequestMapping("flow_${prj.id}_226003")
    public ResponseWrapper<Map<String, Object>> testCommonApi(@RequestBody String json) {
        return new ResponseWrapper<>(commonApi.queryAcctInfo("11150000001936926"));
    }

    /**
     * 测试调用三方 api
     */
    @RequestMapping("flow_${prj.id}_226004")
    public ResponseWrapper<JSONObject> testGxpApi(@RequestBody String json) {
        JSONObject jsonObject = (JSONObject) JSONPath.extract(json, "$.iibs.req.body");

        Map<String, Object> body = new HashMap<>();
        body.put("authKey", "hxb");
        body.put("data", jsonObject.toJSONString());

        return new ResponseWrapper<>(gxpApi.query(body));
    }

    /**
     * 测试 fstore
     */
    @RequestMapping("flow_${prj.id}_226005")
    public ResponseWrapper<String> testFstore(@RequestBody String json) {
        fstoreApi.isExist("M00/4F/45/Z6B3I2hiXZWAGpEEAAAACLukBbM656.txt");
        return new ResponseWrapper<>();
    }

    // ========== 债券业务接口（Filter 已解包，Controller 直接 @RequestBody DTO）==========

    /**
     * 226006 新增业务
     */
    @RequestMapping("flow_${prj.id}_226006")
    public ResponseWrapper<?> submitNewBondBusiness(@RequestBody BondBusinessSaveDTO dto) {
        log.info("收到新增业务请求, bondCode={}", dto.getBondCode());
        bondsBusinessService.saveBusiness(dto);
        return new ResponseWrapper<>();
    }

    /**
     * 226007 修改业务
     */
    @RequestMapping("flow_${prj.id}_226007")
    public ResponseWrapper<?> editBondBusiness(@RequestBody BondBusinessSaveDTO dto) {
        log.info("收到修改业务请求, businessId={}", dto.getBusinessId());
        log.info(dto.toString());
        bondsBusinessService.updateBusiness(dto.getBusinessId(), dto, dto.getUpdaterType());
        return new ResponseWrapper<>();
    }

    /**
     * 226008 变更客户经理
     */
    @RequestMapping("flow_${prj.id}_226008")
    public ResponseWrapper<?> changeBondManager(@RequestBody ManagerChangeDTO dto) {
        log.info("收到变更客户经理请求, businessId={}, newCreator={}, newOrgin={}",
                dto.getBusinessId(), dto.getNewCreator(),dto.getNewOrgCode());
        log.info("收到内容：",dto);
        bondsBusinessService.changeManager(
                dto.getBusinessId(),
                dto.getNewCreator(),
                dto.getNewOrgCode(),
                dto.getNewOrgName(),
                dto.getUpdaterType(),
                dto.getOperator());
        return new ResponseWrapper<>();
    }

    /**
     * 226009 中止业务
     */
    @RequestMapping("flow_${prj.id}_226009")
    public ResponseWrapper<?> terminateBondBusiness(@RequestBody TerminateDTO dto) {
        log.info("收到中止业务请求, bondCode={}, businessId={}, terminator={}, updaterType={}",
                dto.getBondCode(), dto.getBusinessId(), dto.getTerminator(), dto.getUpdaterType());
        // 优先按业务唯一键 biz_uuid 定位（前端已改传 businessId），无则退回按 bondCode
        if (dto.getBusinessId() != null && !dto.getBusinessId().isBlank()) {
            bondsBusinessService.terminateByBizUuid(dto.getBusinessId(), dto.getTerminator(), dto.getUpdaterType());
        } else {
            bondsBusinessService.terminateByBondCode(dto.getBondCode(), dto.getTerminator(), dto.getUpdaterType());
        }
        return new ResponseWrapper<>();
    }

    /**
     * 根据 ECIF 客户号查询客户名称和债券账号（供帆软报表自动填充）。
     * 调用路径：POST /flowservice/json/flow_{prjId}_queryCustomerName
     * 请求体：{ iibs: { req: { body: { ecifCustomerNo: "00000000041406821" } } } }
     * 响应体：{ iibs: { resp: { head: { respCode: "00000" }},
     *                     body: { cusName: "客户名称", noTd: "C200914" } } }
     */
    @RequestMapping("flow_${prj.id}_226010")
    public ResponseWrapper<Map<String, String>> queryCustomerName(@RequestBody EcifQueryDTO dto) {
        log.info("查询客户信息, custNo={}", dto.getCustNo());
        Map<String, String> body = bondsBusinessService.getCustomerInfoByCustNo(dto.getCustNo());
        return new ResponseWrapper<>(body);
    }

    /**
     * 查询账户状态（22600A）。
     *
     * <p>调用 200115 账户状态查询，检查 status 是否为 AS00。
     * 若账号不可用则抛 BusiException，返回统一错误响应。
     *
     * 调用路径：POST /flowservice/json/flow_{prjId}_22600A
     * 请求体：{ iibs: { req: { body: { acctNo: "11159000000417830" } } } }
     * 响应体：{ iibs: { resp: { head: ..., body: AccountStatusVO } } }
     */
    @RequestMapping("flow_${prj.id}_226014")
    public ResponseWrapper<AccountStatusVO> queryAccountStatus(@RequestBody Map<String, String> req) {
        String acctNo = req.get("acctNo");
        log.info("查询账户状态, acctNo={}", acctNo);
        AccountStatusVO statusVo = bondsBusinessService.queryAccountStatus(acctNo);
        return new ResponseWrapper<>(statusVo);
    }

    /**
     * 定时任务，获取业务申报表的业务
     * @return
     */
    @RequestMapping("flow_${prj.id}_226011")
    public ResponseWrapper<Map<String, Object>> testCommonApi1() {
        job.bondSync();
        return new ResponseWrapper<>();
    }
    @RequestMapping("flow_${prj.id}_226012")
    public ResponseWrapper<Map<String, Object>> testCommonApi2() {
        job.exerciseRemind();
        return new ResponseWrapper<>();
    }
    @RequestMapping("flow_${prj.id}_226013")
    public ResponseWrapper<Map<String, Object>> testCommonApi3() {
        job.assistedApprovalSync();
        return new ResponseWrapper<>();
    }
}