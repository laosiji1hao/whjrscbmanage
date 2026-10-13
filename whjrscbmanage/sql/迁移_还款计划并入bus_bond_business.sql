-- 迁移：还款计划并入 bus_bond_business（独立表 bus_repayment_schedule 退役）
-- 起因：原因技术问题把还款计划放独立表并按 bond_code 关联；业务唯一标识已改为 biz_uuid 后，
--       bond_code 可重复，独立表按 bond_code 关联会串数据。故把计划并入主表 instalment_plan(JSON)。

-- 1) 存量 bus_repayment_schedule（status=2）按 bond_code 聚合成 JSON，写回主表 installment_plan
CREATE TEMPORARY TABLE tmp_inst_plan AS
SELECT s.bond_code,
       JSON_ARRAYAGG(JSON_OBJECT('installmentTime', DATE_FORMAT(s.repayment_date, '%Y-%m-%d'),
                                 'installmentAmount', CAST(s.repayment_amount AS CHAR))) AS plan_json
FROM bus_repayment_schedule s
WHERE s.status = 2
GROUP BY s.bond_code;

UPDATE bus_bond_business b
JOIN tmp_inst_plan t ON b.bond_code = t.bond_code
SET b.installment_plan = t.plan_json
WHERE b.installment_plan IS NULL OR b.installment_plan = '';

DROP TEMPORARY TABLE tmp_inst_plan;

-- 2) bus_repayment_schedule 表保留为兼容占位（不再写入）；确认无历史数据后可由运维 DROP：
--    DROP TABLE bus_repayment_schedule;