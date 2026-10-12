package com.hxb.iibs.wuhan.api.impl;

import com.hxb.iibs.wuhan.api.IGxpApi;
import org.springframework.beans.factory.FactoryBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.lang.reflect.Proxy;

@Component
public class GxpApiProxyFactory implements FactoryBean<IGxpApi> {

    @Autowired
    private GxpApiProxy gxpApiProxy;

    @Override
    public IGxpApi getObject() throws Exception {
        return (IGxpApi) Proxy.newProxyInstance(IGxpApi.class.getClassLoader(), new Class[]{IGxpApi.class}, gxpApiProxy);
    }

    @Override
    public Class<?> getObjectType() {
        return IGxpApi.class;
    }
}
