package com.hxb.iibs.wuhan.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.hxb.iibs.wuhan.dto.UpperStorageConfigDTO;
import com.hxb.iibs.wuhan.entity.UpperStorageConfig;

/**
 * 上存利率全局配置 Service。
 */
public interface IUpperStorageConfigService extends IService<UpperStorageConfig> {

    /**
     * 更新全局配置（UPSERT 语义，存在则更新，不存在则插入）。
     *
     * @param dto     新的配置值（couponRate/vat/surcharge）
     * @param updater 修改人OA
     */
    void updateConfig(UpperStorageConfigDTO dto, String updater);

    /**
     * 获取全局配置（GLOBAL 键）。
     *
     * @return 配置记录，无配置时返回含零值的默认对象（不会返回 null）
     */
    UpperStorageConfig getGlobalConfig();
}