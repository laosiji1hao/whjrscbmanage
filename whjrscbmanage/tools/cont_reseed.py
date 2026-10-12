#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""e2e 前置：把 whjrscbmanage 本地库恢复到可重复跑的种子状态（幂等）。

- BC000001(id=4) 恢复 status=0 未完善（上一轮中止后为 5，视图查不到行）
- BC000002(id=5) 恢复为 status=3 生效中 + 补全 look 页必填字段 + invest_rate（供通道费计算不产生 NaN）
- 清理 E2E001 残留（bus_bond_business / bus_repayment_schedule / iassist_flow_data）
- 复位 bus_upper_storage_config（vat=0.06/surcharge=0.012/updater 空）
仅用于本机开发/e2e。
"""
import pymysql

DB = dict(host="127.0.0.1", port=3306, user="root", password="123456",
          db="whjrscbmanage", charset="utf8mb4", autocommit=True)

def main():
    c = pymysql.connect(**DB)
    cur = c.cursor()
    # 1) id=5 恢复 + 补全必填（含 bond_code 还原，幂等应对改号测试）
    cur.execute(
        "UPDATE bus_bond_business SET "
        "bond_code='BC000002', creator='admin', org_name='武汉营业部', biz_name='汉江机械债券二期', "
        "green_tech_flag='3', ext_rating='AAA', ext_rating_date='2026-01-10', "
        "int_rating='AA+', int_rating_date='2026-01-11', industry='1', "
        "start_date='2026-01-12', mature_date='2028-01-12', "
        "orig_amount=10000000, rmb_amount=10000000, balance=10000000, "
        "invest_rate=4.00, agreed_usage='流动资金贷款', "
        "is_passage=NULL, passage_amount=NULL, upper_storage_rate=NULL, "
        "status=3, termination_reason=NULL "
        "WHERE id=5")
    print("id=5 恢复行数:", cur.rowcount)
    # 2) id=4 BC000001 恢复
    cur.execute("UPDATE bus_bond_business SET bond_code='BC000001', status=0, termination_reason=NULL, "
                "creator='admin', org_name='武汉营业部' WHERE id=4")
    cur.execute("UPDATE bus_bond_business SET bond_code='12312313' WHERE id=3")
    cur.execute("UPDATE bus_bond_business SET bond_code='BC000003' WHERE id=6")
    print("id=4/3/6 恢复行数:", cur.rowcount)
    # 3) 清理测试残留（业务行 + 还款计划 + 审批流，幂等含改号变体）
    cur.execute("DELETE FROM bus_repayment_schedule WHERE bond_code != '12312313'")
    cur.execute("DELETE FROM iassist_flow_data WHERE business_no <> '12312313' "
                "OR business_no IS NULL OR business_no = ''")
    cur.execute("DELETE FROM bus_bond_business WHERE bond_code='E2E001'")
    # 3.1) 恢复 BC000002 的还款计划种子 + installment_flag
    cur.execute("INSERT INTO bus_repayment_schedule (bond_code, sort, repayment_date, repayment_amount, status) "
                "VALUES ('BC000002',1,'2026-12-01',100000,2), ('BC000002',2,'2027-06-01',50000,2)")
    cur.execute("UPDATE bus_bond_business SET installment_flag='1' WHERE id=5")
    print("测试残留清理完成（含恢复 BC000002 还款计划种子）")
    # 3.2) 固定种子行 biz_uuid（32 位，测试/smoke 引用稳定）
    fixed_uuids = {
        3: 'a3b3c3d3000000000000000000000003',
        4: 'a3b3c3d3000000000000000000000004',
        5: 'a3b3c3d3000000000000000000000005',
        6: 'a3b3c3d3000000000000000000000006',
    }
    for bid, u in fixed_uuids.items():
        assert len(u) == 32, u
        cur.execute("UPDATE bus_bond_business SET biz_uuid=%s WHERE id=%s", (u, bid))
    print("固定 biz_uuid 已写入种子行")
    # 4) 配置复位
    cur.execute("UPDATE bus_upper_storage_config SET vat=0.060000, surcharge=0.012000, "
                "updater=NULL, update_time=NOW() WHERE id=1")
    print("config 复位行数:", cur.rowcount)
    c.close()
    print("reseed OK")

if __name__ == "__main__":
    main()