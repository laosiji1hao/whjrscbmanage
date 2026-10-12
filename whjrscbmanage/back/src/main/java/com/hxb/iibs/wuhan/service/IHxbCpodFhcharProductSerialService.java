package com.hxb.iibs.wuhan.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.hxb.iibs.wuhan.entity.GapsPBase;
import com.hxb.iibs.wuhan.entity.HxbCpodAmt;
import com.hxb.iibs.wuhan.entity.HxbCpodFhcharProductSerial;

/**
 * <p>
 *  服务类
 * </p>
 *
 * @author baomidou
 * @since 2025-05-29
 */
public interface IHxbCpodFhcharProductSerialService extends IService<HxbCpodFhcharProductSerial> {

    /**
     * 获取最新 cpod
     */
    HxbCpodFhcharProductSerial getLatestCpod();

    /**
     * 初始化 cpod
     */
    void initCpod(String transDate, GapsPBase project);

    /**
     * 更新 cpod
     */
    void updateCpod(HxbCpodAmt cpodAmt);
}
