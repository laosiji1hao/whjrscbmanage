package com.hxb.iibs.wuhan.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

/**
 * OA机构信息表，对应数据库表 whoa_branch_info。
 *
 * <p>字段说明：
 * - id          自增ID
 * - dept_id     部门ID（用于关联查询）
 * - dept_name   部门名称（对应业务表的 orgName）
 * - branch_no   部门编号
 */
@Getter
@Setter
@TableName("whoa_branch_info")
public class WhoaBranchInfo {

    @TableId(type = IdType.AUTO)
    private Integer id;

    /** 部门ID */
    private String deptId;

    /** 上级部门ID */
    private String pDeptId;

    /** 部门名称 */
    private String deptName;

    /** 01 一级分行 02 二级分行 */
    private String bType;

    /** 部门类型 01 分行 02 部室 03 营销部 ... */
    private String deptType;

    /** 部门编号 */
    private String branchNo;

    /** 父级部门编号 */
    private String pBranchNo;

    /** 部门名称2 */
    private String branchName;

    /** 状态 01 有效 02 无效 */
    private String status;

    /** 人力资源系统机构ID */
    private String empOrgId;
}