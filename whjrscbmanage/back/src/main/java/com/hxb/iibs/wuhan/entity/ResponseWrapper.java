package com.hxb.iibs.wuhan.entity;

import com.alibaba.fastjson2.JSONObject;
import com.alibaba.fastjson2.JSONPath;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
public class ResponseWrapper<T> {

    private JSONObject iibs;

    private ResponseWrapper(String code, String message) {
        JSONObject head = new JSONObject();
        head.put("respCode", code);
        head.put("respMsg", message);

        this.iibs = new JSONObject();
        JSONPath.set(this.iibs, "$.resp.head", head);
    }

    public ResponseWrapper(T data) {
        this();
        this.iibs.getJSONObject("resp").put("body", data);
    }

    public ResponseWrapper() {
        this("00000", "接口调用成功");
    }

    public static ResponseWrapper<?> fail(String code, String message) {
        return new ResponseWrapper<>(code, message);
    }

    public static ResponseWrapper<?> fail(String message) {
        return new ResponseWrapper<>("99999", message);
    }

    public static ResponseWrapper<?> fail() {
        return new ResponseWrapper<>("99999", "接口调用失败");
    }
}
