package com.hxb.iibs.wuhan.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hxb.iibs.wuhan.entity.FlowData;
import com.hxb.iibs.wuhan.enums.Constant;
import com.hxb.iibs.wuhan.mapper.FlowDataMapper;
import com.hxb.iibs.wuhan.service.IFlowDataService;
import org.springframework.stereotype.Service;

@Service
public class FlowDataServiceImpl extends ServiceImpl<FlowDataMapper, FlowData> implements IFlowDataService {

    /**
     * 保存审批记录并返回带自增主键的实体。
     * 用于 i助手调用链的第一步：先落库拿到 ybid，再塞入消息体重发 i助手。
     *
     * @param flowData 待保存的审批流水记录（id 字段在 save 后由数据库自动填充）
     */
    @Override
    public FlowData saveAndGetId(FlowData flowData) {
        this.save(flowData);
        return flowData;
    }

    /**
     * 构建待处理的审批记录查询条件：
     * 状态为 PENDING（待审批），按创建时间升序（先提交的先处理）。
     * 供定时轮询任务调用。
     */
    @Override
    public LambdaQueryWrapper<FlowData> queryPending() {
        LambdaQueryWrapper<FlowData> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FlowData::getApprovalStatus, Constant.ApprovalStatus.PENDING);
        wrapper.orderByAsc(FlowData::getCreateTime);
        return wrapper;
    }
}