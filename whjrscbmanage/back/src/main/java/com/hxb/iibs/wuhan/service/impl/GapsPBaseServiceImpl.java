package com.hxb.iibs.wuhan.service.impl;

import com.baomidou.dynamic.datasource.annotation.DS;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hxb.iibs.wuhan.entity.GapsPBase;
import com.hxb.iibs.wuhan.mapper.GapsPBaseMapper;
import com.hxb.iibs.wuhan.service.IGapsPBaseService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * @author baomidou
 * @since 2025-06-25
 */
@DS("common")
@Service
public class GapsPBaseServiceImpl extends ServiceImpl<GapsPBaseMapper, GapsPBase> implements IGapsPBaseService {

    @Override
    public GapsPBase getByProjectId(String projectId) {
        LambdaQueryWrapper<GapsPBase> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(GapsPBase::getProjectId, projectId);
        return this.getOne(wrapper);
    }
}
