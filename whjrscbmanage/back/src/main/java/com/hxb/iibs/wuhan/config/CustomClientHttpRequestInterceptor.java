package com.hxb.iibs.wuhan.config;

import com.hxb.iibs.wuhan.entity.ApiLog;
import com.hxb.iibs.wuhan.service.IApiLogService;
import com.hxb.iibs.wuhan.util.ThreadLocalUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;

@Slf4j
@Component
public class CustomClientHttpRequestInterceptor implements ClientHttpRequestInterceptor {

	@Autowired
	private IApiLogService apiLogService;
	@Autowired
	private Environment environment;

	@Override
	public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
		long start = System.currentTimeMillis();

		// 异步处理逻辑
		new Thread(() -> {
			// 保存接口调用日志
			ApiLog apiLog = new ApiLog();
			apiLog.setProjectId(environment.getProperty("prj.id"));
			apiLog.setProjectName(environment.getProperty("prj.name"));
			apiLog.setProductCode(environment.getProperty("prj.productCode"));
			apiLog.setFlowCode(ThreadLocalUtil.getFlowCode());
			apiLog.setTransCode(ThreadLocalUtil.getTransCode());
			apiLog.setRequestPath(request.getURI().toString());
			apiLog.setRequestTime(LocalDateTime.now());
			apiLogService.save(apiLog);
		}).start();

		ClientHttpResponse resp = execution.execute(request, body);
		log.info("请求 {} 响应码: {}，耗时 {} ms", request.getURI(), resp.getStatusCode(), System.currentTimeMillis() - start);
		return resp;
	}

}
