package com.hxb.iibs.wuhan.api;

import java.io.File;

/**
 * fstore 相关接口
 */
public interface IFstoreApi {

    /**
     * 上传文件
     * @param file 待上传的文件
     * @return 文件存储路径
     */
    String uploadFile(File file);

    /**
     * 上传文件
     * @param group 组名
     * @param file 待上传的文件
     * @return 文件存储路径
     */
    String uploadFile(String group, File file);

    /**
     * 下载文件到 temp.dir
     * @param filePath 文件存储路径
     * @return 已下载的临时文件
     */
    File download(String filePath);

    /**
     * 文件是否存在
     * @param filePath 文件存储路径
     * @return 是否存在
     */
    boolean isExist(String filePath);
}
