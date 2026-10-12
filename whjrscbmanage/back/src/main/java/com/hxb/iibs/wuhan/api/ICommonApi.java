package com.hxb.iibs.wuhan.api;

import com.alibaba.fastjson2.JSONObject;
import com.hxb.iibs.wuhan.anno.CommonApiAnno;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 公共服务接口调用<br/>
 * <ul><li>使用 @CommonApiAnno 定义交易码</li>
 * <li>使用 default 方法简化请求参数</li></ul>
 */
public interface ICommonApi {

    /**
     * 200328 客户基本信息查询（ECIF）。
     *
     * @param body 含 cusNo/ECIF客户号 和 operType=1
     * @return 响应体，含 cusName 等字段
     */
    @CommonApiAnno(transCode = "200328")
    JSONObject queryCustomerInfo(Map<String, Object> body);

    /**
     * 200347 账户信息查询（新）
     */
    @CommonApiAnno(transCode = "200347")
    JSONObject queryAcctInfo(Map<String, Object> body);

    /**
     * 200347 账户信息查询（新）
     *
     * @param acctNo 账号
     * @return
     */
    default JSONObject queryAcctInfo(String acctNo) {
        Map<String, Object> arg = new HashMap<>();
        arg.put("acctNo", acctNo);
        arg.put("flag", "2");
        return this.queryAcctInfo(arg);
    }

    /**
     * 200115 账户状态查询。
     *
     * <p>用于核验账号是否正常可用（status 必须为 AS00）。
     *
     * @param body 含 acctNo / flag(固定2)
     * @return 响应体，含 status/statusTxt/accountName/customerNo 等字段
     */
    @CommonApiAnno(transCode = "200115")
    JSONObject queryAccountStatus(Map<String, Object> body);

    /**
     * 200115 账户状态查询。
     *
     * @param acctNo 账号
     * @return 响应体
     */
    default JSONObject queryAccountStatus(String acctNo) {
        Map<String, Object> arg = new HashMap<>();
        arg.put("acctNo", acctNo);
        arg.put("flag", "2");
        return this.queryAccountStatus(arg);
    }

    /**
     * 200203 企业微信（私有版）消息发送
     */
    @CommonApiAnno("200203")
    JSONObject wxWorkMsgSend(Map<String, Object> body);

    /**
     * 200203 企业微信（私有版）消息发送
     *
     * @param oaList oa列表，支持如下格式: List / Set / String（如 zhangsan / zhangsan,lisi）
     * @param msg    消息本体
     * @return
     */
    default JSONObject wxWorkMsgSend(Object oaList, String msg) {
        Map<String, Object> arg = new HashMap<>();
        // 私有版企业微信账号
        if (oaList instanceof String) {
            arg.put("noticeNo", oaList.toString());
        } else if (oaList instanceof Collection) {
            arg.put("noticeNo", ((Collection) oaList).stream().collect(Collectors.joining(",")));
        }
        // 消息的内容的类型（仅文本）
        arg.put("noticeType", "text");
        // 汉字字符，最多支持512字节
        arg.put("notice", msg);
        // 每条消息最后的落款【来自 xxxxx】，字母大写。INI: 中间业务云平台
        arg.put("sysCode", "INI");
        // 信息描述，起摘要作用，不会发到微信内容里
        arg.put("noticeAbs", "noticeAbs");

        return this.wxWorkMsgSend(arg);
    }
}
