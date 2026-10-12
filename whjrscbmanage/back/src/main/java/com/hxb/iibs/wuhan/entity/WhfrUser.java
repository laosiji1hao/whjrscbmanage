package com.hxb.iibs.wuhan.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 武汉分行用户信息表（主库 whjrscbmanage）。
 * 用于 bondSync 根据 creator 反查 org_code。
 */
@Data
@TableName("whfr_user")
public class WhfrUser {

    @TableId(type = IdType.AUTO)
    private Integer id;

    /** 用户登录账号（等同于 creator / OA 号） */
    private String userId;

    /** 部门编号 → 用作 BondsBusiness.orgCode */
    private String branchNo;

    /** 用户状态：00=有效，01=失效 */
    private String status;
}