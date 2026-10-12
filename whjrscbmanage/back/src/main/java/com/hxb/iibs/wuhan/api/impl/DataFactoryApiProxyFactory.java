package com.hxb.iibs.wuhan.api.impl;

import com.hxb.iibs.wuhan.api.IDataFactoryApi;
import org.springframework.beans.factory.FactoryBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.lang.reflect.Proxy;

@Component
public class DataFactoryApiProxyFactory implements FactoryBean<IDataFactoryApi> {

    @Autowired
    private DataFactoryApiProxy dataFactoryApiProxy;

    @Override
    public IDataFactoryApi getObject() throws Exception {
        return (IDataFactoryApi) Proxy.newProxyInstance(
                IDataFactoryApi.class.getClassLoader(),
                new Class[]{IDataFactoryApi.class},
                dataFactoryApiProxy);
    }

    @Override
    public Class<?> getObjectType() {
        return IDataFactoryApi.class;
    }
}