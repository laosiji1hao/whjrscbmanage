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
    # 1) id=5 恢复 + 补全必填
    cur.execute(
        "UPDATE bus_bond_business SET "
        "creator='admin', org_name='武汉营业部', biz_name='汉江机械债券二期', "
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
    cur.execute("UPDATE bus_bond_business SET status=0, termination_reason=NULL, "
                "creator='admin', org_name='武汉营业部' WHERE id=4")
    print("id=4 恢复行数:", cur.rowcount)
    # 3) 清理测试残留（业务行 + 还款计划 + 审批流）
    cur.execute("DELETE FROM bus_repayment_schedule WHERE bond_code IN ('E2E001','BC000001','BC000002','BC000003')")
    cur.execute("DELETE FROM iassist_flow_data WHERE business_no IN ('E2E001','BC000001','BC000002','BC000003') "
                "OR business_no IS NULL OR business_no = ''")
    cur.execute("DELETE FROM bus_bond_business WHERE bond_code='E2E001'")
    print("测试残留清理完成")
    # 4) 配置复位
    cur.execute("UPDATE bus_upper_storage_config SET vat=0.060000, surcharge=0.012000, "
                "updater=NULL, update_time=NOW() WHERE id=1")
    print("config 复位行数:", cur.rowcount)
    c.close()
    print("reseed OK")

if __name__ == "__main__":
    main()