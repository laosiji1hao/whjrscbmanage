package com.hxb.iibs.wuhan.service;

import com.hxb.iibs.wuhan.entity.ITfHelperMain;

/**
 * i助手发送服务接口
 *
 * <p>bizUuid 仅用于本系统审计流（iassist_flow_data.business_no）的关联身份，
 * **不随报文发给 i助手**（i助手当前不支持该字段）；为空时按报文里的 bond_code 兜底。
 */
public interface IIAssistService {
    void sendIAssist(ITfHelperMain main, String flowCode, String bizUuid);
}