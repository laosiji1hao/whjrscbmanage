package com.hxb.iibs.wuhan.config;

import com.hxb.iibs.wuhan.entity.ResponseWrapper;
import com.hxb.iibs.wuhan.exception.ApiException;
import com.hxb.iibs.wuhan.exception.BusiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler({Exception.class, RuntimeException.class})
    public ResponseEntity<ResponseWrapper<?>> handleException(Exception e) {
        log.error("发生异常", e);
        return new ResponseEntity<>(ResponseWrapper.fail(), HttpStatus.OK);
    }

    // 处理特定类型的异常
    @ExceptionHandler(BusiException.class)
    public ResponseEntity<ResponseWrapper<?>> handleBusiException(BusiException e) {
        log.error("发生业务异常", e);
        return new ResponseEntity<>(ResponseWrapper.fail(e.getCode(), e.getMessage()), HttpStatus.OK);
    }

    // 处理特定类型的异常
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ResponseWrapper<?>> handleApiException(ApiException e) {
        log.error("调用API发生异常", e);
        return new ResponseEntity<>(ResponseWrapper.fail(e.getCode(), e.getMessage()), HttpStatus.OK);
    }
}
