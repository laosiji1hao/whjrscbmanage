package com.hxb.iibs.wuhan.api.impl;

import com.hundsun.jrescloud.middleware.fstore.core.domain.FileInfo;
import com.hundsun.jrescloud.middleware.fstore.core.domain.StorePath;
import com.hundsun.jrescloud.middleware.fstore.pure.FstoreClients;
import com.hundsun.jrescloud.middleware.fstore.pure.FstorePureClientInitializer;
import com.hxb.iibs.wuhan.api.IFstoreApi;
import com.hxb.iibs.wuhan.util.SafePathResolver;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.IOUtils;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.util.List;
import java.util.Properties;

@Slf4j
@Service
public class FstoreApiImpl implements IFstoreApi, InitializingBean {

    @Value("${fstore.enabled}")
    private String enabled;
    @Value("${fstore.group}")
    private String group;
    @Value("${fstore.tracker-list}")
    private List<String> trackerList;

    private FstoreClients clients;

    @Override
    public void afterPropertiesSet() throws Exception {
        Properties props = new Properties();
        props.setProperty("fstore.enabled", enabled);
        for (int i = 0; i < trackerList.size(); i++) {
            String key = String.format("fstore.tracker-list[%d]", i);
            props.setProperty(key, trackerList.get(i));
        }
        clients = FstorePureClientInitializer.init(props);
    }

    /**
     * 上传文件
     *
     * @param file 待上传的文件
     * @return 文件存储路径
     */
    @Override
    public String uploadFile(File file) {
        return this.uploadFile(this.group, file);
    }

    /**
     * 上传文件
     *
     * @param group 组名
     * @param file  待上传的文件
     * @return 文件存储路径
     */
    @Override
    public String uploadFile(String group, File file) {
        try (InputStream is = new FileInputStream(file)) {
            StorePath storePath = clients.getFstoreFileStorageClient().uploadFile(group, is, file.length(), FilenameUtils.getExtension(file.getName()));
            log.info("fstore 文件上传成功: {}", storePath.getFullPath());
            return storePath.getFullPath();
        } catch (IOException e) {
            log.error("fstore 文件上传失败", e);
            throw new RuntimeException(e);
        }
    }

    /**
     * 下载文件到 temp.dir
     *
     * @param filePath 文件存储路径
     */
    @Override
    public File download(String filePath) {
        if (4 == filePath.split("/").length) { // 文件存储路径只有 4 段时追加默认 group
            filePath = this.group + "/" + filePath;
        }
        StorePath storePath = StorePath.parseFromUrl(filePath);
        log.info("fstore 存储路径: {}", storePath);

        String filename = storePath.getPath().substring(storePath.getPath().lastIndexOf("/") + 1);
        File outputFile = SafePathResolver.resolveSafePath(filename).toFile();
        try (OutputStream os = new FileOutputStream(outputFile)) {
            clients.getFstoreFileStorageClient().downloadFile(storePath.getGroup(), storePath.getPath(), (is) -> {
                IOUtils.copy(is, os);
                return null;
            });

            log.info("fstore 文件下载成功: {}", outputFile.getPath());
            return outputFile;
        } catch (IOException e) {
            log.error("fstore 文件下载失败", e);
            throw new RuntimeException(e);
        }
    }

    /**
     * 文件是否存在
     *
     * @param filePath 文件存储路径
     * @return 是否存在
     */
    @Override
    public boolean isExist(String filePath) {
        if (4 == filePath.split("/").length) { // 文件存储路径只有 4 段时追加默认 group
            filePath = this.group + "/" + filePath;
        }
        StorePath storePath = StorePath.parseFromUrl(filePath);
        log.info("fstore 存储路径: {}", storePath);

        try {
            FileInfo fileInfo = clients.getFstoreFileStorageClient().queryFileInfo(storePath.getGroup(), storePath.getPath());
            log.info("fstore 文件信息: {}", fileInfo.toString());
            return true;
        } catch (Exception e) {
            log.error("获取 fstore 文件信息异常", e);
            return false;
        }
    }
}
