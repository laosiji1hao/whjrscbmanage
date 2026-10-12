package com.hxb.iibs.wuhan.util;

import lombok.extern.slf4j.Slf4j;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.yaml.snakeyaml.Yaml;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.security.Security;
import java.util.Arrays;
import java.util.Base64;
import java.util.Map;
import java.util.Properties;
@Slf4j
public class YamlUtil {


    public static void main(String[] args) throws Exception {
        String yamlPath = System.getProperty("user.dir") + "/src/main/resources/application.yml";
        log.info("yamlPath:{}", yamlPath);
        Properties properties = new Properties();

        try (FileInputStream inputStream = new FileInputStream(yamlPath)) {
            Yaml yaml = new Yaml();
            Map<String, Object> yamlData = yaml.load(inputStream);
            mapToProperties(yamlData, properties, null);
            properties.stringPropertyNames().stream().sorted().forEach(ele -> {
                log.info(ele + " = " + properties.getProperty(ele));
            });
        } catch (Exception e) {
            log.error("YAML文件未找到！" + e.getMessage());
        }

    }
    static {
        // 国密需要 BC 的支持
        Security.addProvider(new BouncyCastleProvider());
    }

    private static void mapToProperties(Map<String, Object> map, Properties properties, String prefix) {
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();

            if (value instanceof Map) {
                mapToProperties((Map<String, Object>) value, properties, prefix != null ? prefix + key + "." : key + ".");
            } else {
                String fullKey = prefix != null ? prefix + key : key;
                properties.put(fullKey, value.toString());
            }
        }
    }

    private static byte[] generateKey() throws Exception {
        String key = "武汉分行中间业务云平台";
        MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
        return Arrays.copyOfRange(sha256.digest(key.getBytes(StandardCharsets.UTF_8)), 0, 16);
    }

    private static String encrypt(String plainStr) throws Exception {
        // 生成随机 16 位 IV向量
        byte[] iv = new byte[16];
        SecureRandom random = new SecureRandom();
        random.nextBytes(iv);
        IvParameterSpec ivSpec = new IvParameterSpec(iv);

        // 加密
        Cipher cipher = Cipher.getInstance("SM4/GCM/NoPadding");
        GCMParameterSpec gcmSpec = new GCMParameterSpec(128, iv);
        cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(generateKey(), "SM4"), gcmSpec);
        byte[] cipherText = cipher.doFinal(plainStr.getBytes(StandardCharsets.UTF_8));

        // 将IV向量与密文拼接
        byte[] combined = new byte[iv.length + cipherText.length];
        System.arraycopy(iv, 0, combined, 0, iv.length);
        System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);

        return Base64.getEncoder().encodeToString(combined);
    }

    public static String decrypt(String cipherStr) throws Exception {
        byte[] data = Base64.getDecoder().decode(cipherStr);

        // 分离IV向量与密文
        byte[] iv = new byte[16];
        byte[] cipherText = new byte[data.length - iv.length];
        System.arraycopy(data, 0, iv, 0, iv.length);
        System.arraycopy(data, iv.length, cipherText, 0, cipherText.length);

        // 解密
        Cipher cipher = Cipher.getInstance("SM4/GCM/NoPadding");
        GCMParameterSpec gcmSpec = new GCMParameterSpec(128, iv);
        cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(generateKey(), "SM4"), gcmSpec);
        byte[] decrypted = cipher.doFinal(cipherText);

        return new String(decrypted, StandardCharsets.UTF_8);
    }
}
