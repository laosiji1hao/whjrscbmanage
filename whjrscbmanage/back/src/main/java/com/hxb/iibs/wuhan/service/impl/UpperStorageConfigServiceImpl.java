package com.hxb.iibs.wuhan.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hxb.iibs.wuhan.dto.UpperStorageConfigDTO;
import com.hxb.iibs.wuhan.entity.UpperStorageConfig;
import com.hxb.iibs.wuhan.mapper.UpperStorageConfigMapper;
import com.hxb.iibs.wuhan.service.IUpperStorageConfigService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 上存利率全局配置 Service 实现。
 */
@Service
public class UpperStorageConfigServiceImpl
        extends ServiceImpl<UpperStorageConfigMapper, UpperStorageConfig>
        implements IUpperStorageConfigService {

    /** 配置键，固定值 */
    private static final String CONFIG_KEY_GLOBAL = "GLOBAL";

    @Override
    public void updateConfig(UpperStorageConfigDTO dto, String updater) {
        UpperStorageConfig existing = lambdaQuery()
                .eq(UpperStorageConfig::getConfigKey, CONFIG_KEY_GLOBAL)
                .one();

        if (existing != null) {
            // 更新已有记录
            existing.setCouponRate(dto.getCouponRate());
            existing.setVat(dto.getVat());
            existing.setSurcharge(dto.getSurcharge());
            existing.setUpdater(updater);
            existing.setUpdateTime(LocalDateTime.now());
            updateById(existing);
        } else {
            // 插入新记录
            UpperStorageConfig record = new UpperStorageConfig();
            record.setConfigKey(CONFIG_KEY_GLOBAL);
            record.setCouponRate(dto.getCouponRate());
            record.setVat(dto.getVat());
            record.setSurcharge(dto.getSurcharge());
            record.setUpdater(updater);
            record.setUpdateTime(LocalDateTime.now());
            save(record);
        }
    }

    @Override
    public UpperStorageConfig getGlobalConfig() {
        return lambdaQuery()
                .eq(UpperStorageConfig::getConfigKey, CONFIG_KEY_GLOBAL)
                .oneOpt()
                .orElse(getDefaultConfig());
    }

    /**
     * 无配置时返回宽松默认值，避免 NPE 导致定时任务中断。
     */
    private UpperStorageConfig getDefaultConfig() {
        UpperStorageConfig def = new UpperStorageConfig();
        def.setCouponRate(BigDecimal.ZERO);
        def.setVat(BigDecimal.ZERO);
        def.setSurcharge(BigDecimal.ZERO);
        return def;
    }
}