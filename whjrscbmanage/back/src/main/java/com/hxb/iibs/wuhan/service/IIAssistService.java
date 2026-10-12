package com.hxb.iibs.wuhan.service;

import com.hxb.iibs.wuhan.entity.ITfHelperMain;

/**
 * i助手发送服务接口
 */
public interface IIAssistService {
    void sendIAssist(ITfHelperMain main, String flowCode);
}