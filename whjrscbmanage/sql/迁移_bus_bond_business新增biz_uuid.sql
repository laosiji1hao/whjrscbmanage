-- 迁移：bus_bond_business 新增业务唯一键 biz_uuid（UUID，可重复执行——幂等）
-- 背景：债券编号 bond_code 不再作为身份唯一键（已放开编辑），新增 UUID 作为每笔业务唯一标识，
--       区别于自增主键 id。新库直接从 whjrscbmanage.sql 建（含 biz_uuid NOT NULL + uk_biz_uuid）。

-- 1) 加列（可空）
ALTER TABLE bus_bond_business ADD COLUMN biz_uuid varchar(36) NULL COMMENT '业务唯一键UUID(32位无横线)' AFTER id;

-- 2) 存量行回填
UPDATE bus_bond_business SET biz_uuid = REPLACE(UUID(), '-', '') WHERE biz_uuid IS NULL OR biz_uuid = '';

-- 3) 收紧为 NOT NULL
ALTER TABLE bus_bond_business MODIFY COLUMN biz_uuid varchar(36) NOT NULL COMMENT '业务唯一键UUID(32位无横线)';

-- 4) 唯一约束
ALTER TABLE bus_bond_business ADD CONSTRAINT uk_biz_uuid UNIQUE (biz_uuid);