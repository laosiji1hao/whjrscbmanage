package com.hxb.iibs.wuhan.config;

import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;

import java.io.ByteArrayInputStream;

/**
 * 将内存中的字节数组包装为标准 ServletInputStream，供 HttpServletRequestWrapper 重写 getInputStream() 使用。
 *
 * <p>原理：Filter 读取原始请求体后，{@link #getInputStream()} 返回的是一个全新的 ByteArrayInputStream，
 * 因此即使原始 InputStream 已被消费过一次，后续的 Controller / Spring MVC 仍能正常读取。</p>
 */
public class DelegatingServletInputStream extends ServletInputStream {

    private final ByteArrayInputStream sourceStream;

    /**
     * 用给定的字节数组构造一个代理流。
     *
     * @param source 任意 UTF-8 编码的 JSON 字符串转换成的字节数组
     */
    public DelegatingServletInputStream(byte[] source) {
        this.sourceStream = new ByteArrayInputStream(source);
    }

    /**
     * 从内部缓冲区读取下一个字节，流结束时返回 -1。
     */
    @Override
    public int read() {
        return sourceStream.read();
    }

    /**
     * 判断底层缓冲是否已全部读完，即 {@code available() == 0}。
     */
    @Override
    public boolean isFinished() {
        return sourceStream.available() == 0;
    }

    /**
     * 总是返回 true，表示数据始终可读（因为已经在内存中）。
     */
    @Override
    public boolean isReady() {
        return true;
    }

    /**
     * 非阻塞 IO 场景暂不支持，留空实现。
     *
     * @param listener 不使用
     */
    @Override
    public void setReadListener(ReadListener listener) {
        // non-blocking API, not implemented yet
    }
}