package com.hxb.iibs.wuhan.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.hxb.iibs.wuhan.entity.FlowType;

public interface IFlowTypeService extends IService<FlowType> {
    FlowType getByFlowCode(String flowCode);
}