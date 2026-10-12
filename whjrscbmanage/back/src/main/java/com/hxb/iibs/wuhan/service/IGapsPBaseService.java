package com.hxb.iibs.wuhan.service;

import com.hxb.iibs.wuhan.entity.GapsPBase;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * <p>
 *  服务类
 * </p>
 *
 * @author baomidou
 * @since 2025-06-25
 */
public interface IGapsPBaseService extends IService<GapsPBase> {

    GapsPBase getByProjectId(String projectId);
}
