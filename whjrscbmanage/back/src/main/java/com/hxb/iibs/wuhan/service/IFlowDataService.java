package com.hxb.iibs.wuhan.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.IService;
import com.hxb.iibs.wuhan.entity.FlowData;

public interface IFlowDataService extends IService<FlowData> {
    FlowData saveAndGetId(FlowData flowData);
    LambdaQueryWrapper<FlowData> queryPending();
}