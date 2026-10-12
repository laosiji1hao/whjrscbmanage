package com.hxb.iibs.wuhan.service.impl;

import com.baomidou.dynamic.datasource.annotation.DS;
import com.hxb.iibs.wuhan.entity.ApiLog;
import com.hxb.iibs.wuhan.mapper.ApiLogMapper;
import com.hxb.iibs.wuhan.service.IApiLogService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 接口调用日志表 服务实现类
 * </p>
 *
 * @author baomidou
 * @since 2025-06-10
 */
@DS("common")
@Service
public class ApiLogServiceImpl extends ServiceImpl<ApiLogMapper, ApiLog> implements IApiLogService {

}
