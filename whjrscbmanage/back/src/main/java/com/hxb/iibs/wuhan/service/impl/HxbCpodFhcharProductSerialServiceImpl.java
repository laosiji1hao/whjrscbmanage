package com.hxb.iibs.wuhan.service.impl;

import com.baomidou.dynamic.datasource.annotation.DS;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hxb.iibs.wuhan.entity.GapsPBase;
import com.hxb.iibs.wuhan.entity.HxbCpodAmt;
import com.hxb.iibs.wuhan.entity.HxbCpodFhcharProductSerial;
import com.hxb.iibs.wuhan.mapper.HxbCpodFhcharProductSerialMapper;
import com.hxb.iibs.wuhan.service.IHxbCpodFhcharProductSerialService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * @author baomidou
 * @since 2025-05-29
 */
@DS("common")
@Service
public class HxbCpodFhcharProductSerialServiceImpl extends ServiceImpl<HxbCpodFhcharProductSerialMapper, HxbCpodFhcharProductSerial> implements IHxbCpodFhcharProductSerialService {

    @Value("${prj.productCode}")
    private String productCode;

    /**
     * 获取最新 cpod
     */
    @Override
    public HxbCpodFhcharProductSerial getLatestCpod() {
        LambdaQueryWrapper<HxbCpodFhcharProductSerial> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(HxbCpodFhcharProductSerial::getProductCode, productCode);
        wrapper.orderByDesc(HxbCpodFhcharProductSerial::getTransDate);
        wrapper.last("limit 1");
        return this.getOne(wrapper);
    }

    /**
     * 初始化 cpod
     *
     * @param transDate
     */
    @Override
    public void initCpod(String transDate, GapsPBase project) {
        HxbCpodFhcharProductSerial cpod = new HxbCpodFhcharProductSerial();
        cpod.setPltDate(transDate);
        cpod.setPltTime("000000");
        cpod.setPltSerial(project.getProductCode() + transDate);
        cpod.setChannelCtrlFlag(project.getProductCode().startsWith("P65") ? "1" : "2");
        cpod.setBranchCode("1100");
        cpod.setBranchName("武汉分行");
        cpod.setChannel("900");
        cpod.setChannelName("华夏总行中间业务渠道");
        cpod.setProductCode(project.getProductCode());
        cpod.setProductName(project.getProjectName());
        cpod.setBusiNo(project.getFrCode());
        cpod.setBusiName(project.getProjectName());
        cpod.setBusiTypeCode(project.getBusiTypeCode());
        cpod.setBusiTypeName(project.getBusiTypeName());
        cpod.setAcctType("");
        cpod.setBusiYear(transDate.substring(0, 4));
        cpod.setBillingMonth(transDate.substring(0, 6));
        cpod.setTransDate(transDate);
        cpod.setTransCount(0);
        cpod.setTransNum(0);
        cpod.setTransAmt(BigDecimal.ZERO);
        cpod.setTransType("");
        cpod.setCollectionAmt(BigDecimal.ZERO);
        cpod.setCDFlag("");
        cpod.setCtrlFlag(project.getCtrlFlag());
        cpod.setGroupName("dev-wuhanfh");
        cpod.setAccptDate(project.getOnlineDate());
        cpod.setVoucherAmt(project.getVoucherAmt());
        cpod.setAttachInfo1("");
        cpod.setExtField1("");
        cpod.setExtField2("");
        cpod.setExtField3("");

        this.save(cpod);
    }

    /**
     * 更新 cpod
     */
    @Override
    public void updateCpod(HxbCpodAmt cpodAmt) {
        LambdaUpdateWrapper<HxbCpodFhcharProductSerial> wrapper = new LambdaUpdateWrapper<>();
        wrapper.set(HxbCpodFhcharProductSerial::getPltTime, LocalDateTime.now().format(DateTimeFormatter.ofPattern("HHmmss")));

        if (ObjectUtils.isEmpty(cpodAmt)) { // 非金融交易
            wrapper.setIncrBy(HxbCpodFhcharProductSerial::getTransNum, 1); // 非金融交易量
        } else { // 金融交易
            wrapper.setIncrBy(HxbCpodFhcharProductSerial::getTransCount, 1); // 金融交易量
            wrapper.setIncrBy(HxbCpodFhcharProductSerial::getTransAmt, cpodAmt.getTransAmt()); // 交易金额
            wrapper.setIncrBy(HxbCpodFhcharProductSerial::getCollectionAmt, cpodAmt.getCollectionAmt()); // 沉淀资金金额
            wrapper.set(HxbCpodFhcharProductSerial::getTransType, cpodAmt.getTransType());
            wrapper.set(HxbCpodFhcharProductSerial::getCDFlag, cpodAmt.getCDFlag());
            wrapper.set(HxbCpodFhcharProductSerial::getAcctType, cpodAmt.getAcctType());
        }

        wrapper.eq(HxbCpodFhcharProductSerial::getProductCode, productCode);
        wrapper.eq(HxbCpodFhcharProductSerial::getTransDate, LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")));
        this.update(wrapper);
    }
}
