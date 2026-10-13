-- 迁移：业务唯一标识已由 bond_code 切换为 biz_uuid。
-- bond_code 降级为普通业务编号，允许重复（支撑"创建分期沿用同一债券编号"等场景）。
-- 幂等写法：先删约束，若不存在则忽略报错继续。

-- 去掉历史唯一索引 uk_bond_code（bond_code 不再承担唯一身份）
ALTER TABLE bus_bond_business DROP INDEX uk_bond_code;