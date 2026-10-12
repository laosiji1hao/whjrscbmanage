package com.hxb.iibs.wuhan.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hxb.iibs.wuhan.entity.FlowType;
import com.hxb.iibs.wuhan.mapper.FlowTypeMapper;
import com.hxb.iibs.wuhan.service.IFlowTypeService;
import org.springframework.stereotype.Service;

@Service
public class FlowTypeServiceImpl extends ServiceImpl<FlowTypeMapper, FlowType> implements IFlowTypeService {

    @Override
    public FlowType getByFlowCode(String flowCode) {
        LambdaQueryWrapper<FlowType> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FlowType::getFlowCode, flowCode);
        return this.getOne(wrapper);
    }
}