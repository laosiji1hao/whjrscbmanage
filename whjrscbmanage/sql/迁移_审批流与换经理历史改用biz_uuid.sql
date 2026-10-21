-- 迁移：iassist_flow_data / bus_manager_change_history 的业务关联由 bond_code / 自增id 改为 biz_uuid
-- 背景：业务唯一标识已收敛为 biz_uuid（bond_code 可重复、主表 id 为内部自增）。
--       审批流此前用 business_no 存 bond_code，改号需重链；换经理历史用 business_id 存主表 id。
--       现在两者都改为按 biz_uuid 关联（32 位无横线），同号多笔业务不再交叉锁定。
-- 幂等：只处理"business_no 仍是 bond_code"的存量行；新写入的行 business_no 已是 biz_uuid。

-- 1) iassist_flow_data.business_no：存量 bond_code → 对应业务的 biz_uuid
--    只改 business_no 在当前库能唯一对应一笔业务的记录（保底用 LIMIT 1 避免同号多笔串改）
UPDATE iassist_flow_data f
LEFT JOIN bus_bond_business b
       ON b.bond_code = f.business_no
      AND LENGTH(b.biz_uuid) = 32
SET f.business_no = b.biz_uuid
WHERE f.business_no NOT IN (SELECT biz_uuid FROM bus_bond_business)
  AND f.business_no <> ''
  AND b.biz_uuid IS NOT NULL
  AND (SELECT COUNT(*) FROM bus_bond_business bb WHERE bb.bond_code = f.business_no) = 1;

-- 2) bus_manager_change_history.business_id：bigint(自增id) → varchar(50)(biz_uuid)
--    先加新列并回填，再换列定义，避免外键/唯一索引冲突
ALTER TABLE bus_manager_change_history
    ADD COLUMN business_uuid varchar(50) NULL COMMENT '业务唯一键biz_uuid' AFTER business_id;

UPDATE bus_manager_change_history h
LEFT JOIN bus_bond_business b ON b.id = h.business_id
SET h.business_uuid = b.biz_uuid
WHERE h.business_uuid IS NULL;

ALTER TABLE bus_manager_change_history DROP INDEX idx_business_id;
ALTER TABLE bus_manager_change_history
    MODIFY COLUMN business_id varchar(50) NOT NULL COMMENT '关联业务唯一键 biz_uuid（不再用主表自增id）';
UPDATE bus_manager_change_history SET business_id = business_uuid WHERE business_uuid IS NOT NULL;
ALTER TABLE bus_manager_change_history DROP COLUMN business_uuid;
CREATE INDEX idx_business_id ON bus_manager_change_history (business_id);

-- 注：bus_repayment_schedule 已随"还款计划并入主表"退役（不再写入/读取），保持 bond_code 联想不变。