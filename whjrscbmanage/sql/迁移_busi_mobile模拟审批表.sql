-- 迁移：i助手审批模拟表（本地联调用）
-- 模拟真实 i助手：新增申报写入 busi_mobile（i助手侧），审批结果由 sim_approve.py（扮演 CommonJob 定时任务）回同步。
-- 注意：真实 i助手在审批中会补填 业务品种(biz_type)/对应处室(dept)/是否有通道费(is_passage)/通道费金额(passage_amount)，
--       因此在置 approve_status='成功' 前必须带上这 4 项（sim_approve.py 强制校验）。
CREATE TABLE IF NOT EXISTS busi_mobile.mock_approval_new (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bond_code VARCHAR(60) NULL,
  apply_no VARCHAR(60) NULL,
  biz_uuid VARCHAR(36) NOT NULL,
  biz_type VARCHAR(10) NULL COMMENT '业务品种(码) 审批中由i助手补填',
  dept VARCHAR(10) NULL COMMENT '对应处室(码) 审批中由i助手补填',
  is_passage VARCHAR(10) NULL COMMENT '是否有通道费 0/1 审批中由i助手补填',
  passage_amount DECIMAL(18,2) NULL COMMENT '通道费金额 审批中由i助手补填',
  approve_status VARCHAR(20) DEFAULT '' COMMENT ''=待审 成功/失败=结果',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='i助手审批模拟表（联动 sim_approve.py）';