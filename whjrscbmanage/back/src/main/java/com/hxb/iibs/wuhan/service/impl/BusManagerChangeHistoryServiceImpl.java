package com.hxb.iibs.wuhan.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hxb.iibs.wuhan.entity.BusManagerChangeHistory;
import com.hxb.iibs.wuhan.mapper.BusManagerChangeHistoryMapper;
import com.hxb.iibs.wuhan.service.IBusManagerChangeHistoryService;
import org.springframework.stereotype.Service;

@Service
public class BusManagerChangeHistoryServiceImpl
        extends ServiceImpl<BusManagerChangeHistoryMapper, BusManagerChangeHistory>
        implements IBusManagerChangeHistoryService {
}