package com.hxb.iibs.wuhan.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateSerializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Jackson 全局序列化/反序列化配置，作用于 Spring MVC HTTP 消息转换器。
 *
 * <p>目标：兼容前端常见的几种日期格式：
 * <ul>
 *   <li>{@code yyyy-MM-dd} —— 标准短日期</li>
 *   <li>{@code yyyy-MM-dd HH:mm:ss} —— 带时分的完整日期（含末尾零）</li>
 * </ul>
 */
@Configuration
public class JacksonConfig implements WebMvcConfigurer {

    /** 标准短日期格式（用于输出） */
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    /** 完整日期时间格式（输入容错，支持含时分秒的前端正则格式） */
    private static final DateTimeFormatter DATETIME_INPUT_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * 构建经过容错配置的 ObjectMapper，供全局使用。
     */
    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        return buildObjectMapper();
    }

    /**
     * 重写 Spring MVC 的消息转换器，把默认的 MappingJackson2HttpMessageConverter 替换为
     * 使用我们容错 ObjectMapper 的版本。这样就能拦截住所有 HTTP 请求中的日期字符串反序列化。
     */
    @Override
    public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
        // 先移除 Spring Boot 默认注册的 Jackson converter（JDK 自动注册的那几个）
        converters.removeIf(c -> c instanceof org.springframework.http.converter.json.MappingJackson2HttpMessageConverter);

        MappingJackson2HttpMessageConverter customConverter = new MappingJackson2HttpMessageConverter();
        customConverter.setObjectMapper(buildObjectMapper());

        // 设置支持的 media types
        List<MediaType> supportedTypes = new ArrayList<>();
        supportedTypes.add(MediaType.APPLICATION_JSON);
        supportedTypes.add(MediaType.valueOf("application/json;charset=UTF-8"));
        customConverter.setSupportedMediaTypes(supportedTypes);

        converters.add(0, customConverter);
    }

    private ObjectMapper buildObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();

        SimpleModule customModule = new SimpleModule("custom-date-parsing");

        // ============ LocalDate 反序列化 ============
        // 容错策略：空字符串 → null → 标准格式 → 含时分秒的字符串切掉尾巴 → ISO-T 格式兜底
        customModule.addDeserializer(LocalDate.class, new StdDeserializer<LocalDate>(LocalDate.class) {
            @Override
            public LocalDate deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
                String value = p.getValueAsString().trim();
                if (value.isEmpty()) {
                    return null;
                }
                try {
                    return LocalDate.parse(value, DATE_FORMATTER);
                } catch (Exception ignored) {}
                if (value.length() >= 10) {
                    try {
                        return LocalDate.parse(value.substring(0, 10), DATE_FORMATTER);
                    } catch (Exception ignored) {}
                }
                throw new IllegalArgumentException(
                        "Cannot parse '" + value + "' as LocalDate; expected formats: yyyy-MM-dd or yyyy-MM-dd HH:mm:ss");
            }
        });

        // 输出保持标准短格式
        customModule.addSerializer(LocalDate.class, new LocalDateSerializer(DATE_FORMATTER));

        // ============ LocalDateTime 反序列化 ============
        // 空字符串 → null，其他同 LocalDate
        customModule.addDeserializer(LocalDateTime.class, new StdDeserializer<LocalDateTime>(LocalDateTime.class) {
            @Override
            public LocalDateTime deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
                String value = p.getValueAsString().trim();
                if (value.isEmpty()) {
                    return null;
                }
                try {
                    return LocalDateTime.parse(value, DATETIME_INPUT_FORMATTER);
                } catch (Exception ignored) {}
                try {
                    return LocalDateTime.parse(value.replace(' ', 'T'));
                } catch (Exception ignored) {}
                if (value.length() >= 19) {
                    try {
                        return LocalDateTime.parse(value.substring(0, 19).replace(' ', 'T'),
                                DATETIME_INPUT_FORMATTER);
                    } catch (Exception ignored) {}
                }
                throw new IllegalArgumentException(
                        "Cannot parse '" + value + "' as LocalDateTime; expected formats: yyyy-MM-ddTHH:mm:ss or yyyy-MM-dd HH:mm:ss");
            }
        });

        customModule.addSerializer(LocalDateTime.class, new LocalDateTimeSerializer(DATETIME_INPUT_FORMATTER));

        mapper.registerModule(customModule);

        // 忽略未知字段
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        // 不将日期序列化为时间戳
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        return mapper;
    }
}