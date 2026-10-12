package com.hxb.iibs.wuhan.util;

import java.nio.file.Path;
import java.nio.file.Paths;

public class SafePathResolver {

    private static final Path BASE_DIR = Paths.get("/file");

    /**
     * 根据用户输入的 filename，安全地解析出完整路径
     */
    public static Path resolveSafePath(String userInputFilename) {
        if (userInputFilename == null || userInputFilename.isEmpty()) {
            throw new IllegalArgumentException("文件名不能为空");
        }

        if (!userInputFilename.matches("^[a-zA-Z0-9._-]+$")) {
            throw new IllegalArgumentException("文件名包含非法字符");
        }

        if (userInputFilename.startsWith(".") || userInputFilename.contains("/.") || userInputFilename.contains("\\.")) {
            throw new SecurityException("禁止访问隐藏文件");
        }

        // 1. 拼接路径（使用 resolve，它会正确处理相对路径）
        Path resolvedPath = BASE_DIR.resolve(userInputFilename).normalize();

        // 2. 关键检查：确保结果路径仍在 baseDirectory 内部
        if (!resolvedPath.startsWith(BASE_DIR)) {
            throw new SecurityException("非法路径访问尝试: " + userInputFilename);
        }

        return resolvedPath;
    }
}
