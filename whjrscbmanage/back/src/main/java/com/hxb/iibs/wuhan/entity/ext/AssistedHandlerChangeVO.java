package com.hxb.iibs.wuhan.entity.ext;

import lombok.Data;

/** 226008 专用视图 */
@Data
public class AssistedHandlerChangeVO {
    private Long ybid;
    private String bondCode;
    /** 变更人类型：0=客户经理，1=业务管理员 */
    private String updaterType;
    /** 旧经办人（OA）*/
    private String oldHandler;
    /** 旧机构编码 */
    private String oldOrgCode;
    /** 旧机构名称 */
    private String oldOrgName;
    /** 新经办人（OA）*/
    private String newHandler;
    /** 新机构编码 */
    private String newOrgCode;
    /** 新机构名称 */
    private String newOrgName;
    /** i助手审批结论："成功" 或其他 */
    private String approveStatus;
    /** 审批意见（approve_info） */
    private String remark;
}