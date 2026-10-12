package com.hxb.iibs.wuhan.api.impl;

import com.hxb.iibs.wuhan.api.ICommonApi;
import org.springframework.beans.factory.FactoryBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.lang.reflect.Proxy;

@Component
public class CommonApiProxyFactory implements FactoryBean<ICommonApi> {

    @Autowired
    private CommonApiProxy commonApiProxy;

    @Override
    public ICommonApi getObject() throws Exception {
        return (ICommonApi) Proxy.newProxyInstance(ICommonApi.class.getClassLoader(), new Class[]{ICommonApi.class}, commonApiProxy);
    }

    @Override
    public Class<?> getObjectType() {
        return ICommonApi.class;
    }
}
