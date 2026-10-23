#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""e2e 前置：把 whjrscbmanage 本地库恢复到可重复跑的种子状态（幂等）。

- BC000001(id=4) 恢复 status=0 未完善（上一轮中止后为 5，视图查不到行）
- BC000002(id=5) 恢复为 status=3 生效中 + 补全 look 页必填字段 + invest_rate（供通道费计算不产生 NaN）
- 清理 E2E001 残留（bus_bond_business / iassist_flow_data）
- 复位 bus_upper_storage_config（vat=0.06/surcharge=0.012/updater 空）
仅用于本机开发/e2e。
"""
import pymysql

DB = dict(host="127.0.0.1", port=3306, user="root", password="123456",
          db="whjrscbmanage", charset="utf8mb4", autocommit=True)

def main():
    c = pymysql.connect(**DB)
    cur = c.cursor()
    # 1) id=5 恢复 + 补全全部必填（look 46 项对齐必要性，改为"完整生效业务"）
    cur.execute(
        "UPDATE bus_bond_business SET "
        "bond_code='BC000002', creator='admin', org_name='武汉营业部', biz_name='汉江机械债券二期', "
        "customer_no='C0002', customer_name='湖北汉江机械制造有限公司', ecif_customer_no='00000000000000002', "
        "bond_type='0', green_tech_flag='3', ext_rating='AAA', ext_rating_date='2026-01-10', "
        "rating_agency='标准普尔', int_rating='AA+', int_rating_date='2026-01-11', "
        "lead_underwriter='中金公司', industry='1', customer_type='1', alert_customer='0', "
        "biz_type='0', start_date='2026-01-12', mature_date='2028-01-12', currency='人民币', "
        "orig_amount=10000000, rmb_amount=10000000, balance=10000000, "
        "invest_rate=4.00, transfer_rate=1.50, guarantee_info='信用', breach_flag='0', "
        "five_level_class='正常一档', our_bank_underwrite='1', agreed_usage='流动资金贷款', "
        "manage_line='金融市场部', dept='1', fund_account_flag='0', supervise_account_flag='0', "
        "fund_used_flag='0', fund_used_up='0', remark_number='P-001', remark='批复管理要求', "
        "js_remark_flag='0', inspect_freq='3', is_original_am='0', exercise_flag='0', "
        "inspector_post='客户经理', "
        "is_passage=NULL, passage_amount=NULL, upper_storage_rate=NULL, "
        "status=3, termination_reason=NULL "
        "WHERE id=5")
    print("id=5 恢复行数:", cur.rowcount)
    # 2) id=4 BC000001 恢复为生效中（供 e2e 流程 B「中止」使用；中止成功后下一轮再以生效中姿态复活）
    cur.execute("UPDATE bus_bond_business SET bond_code='BC000001', status=3, termination_reason=NULL, "
                "creator='admin', org_name='武汉营业部' WHERE id=4")
    cur.execute("UPDATE bus_bond_business SET bond_code='12312313' WHERE id=3")
    cur.execute("UPDATE bus_bond_business SET bond_code='BC000003' WHERE id=6")
    print("id=4/3/6 恢复行数:", cur.rowcount)
    # 3) 清理测试残留（业务行 + 还款计划 + 审批流，幂等含改号变体）
    cur.execute("DELETE FROM iassist_flow_data WHERE business_no <> '12312313' "
                "OR business_no IS NULL OR business_no = ''")
    cur.execute("DELETE FROM bus_bond_business WHERE bond_code='E2E001'")
    # 3.1) 恢复 BC000002 的还款计划种子（并入主表 installment_plan JSON）+ installment_flag
    cur.execute(
        "UPDATE bus_bond_business SET installment_flag='1', "
        "installment_plan='[{\"installmentTime\":\"2026-12-01\",\"installmentAmount\":\"100000\"},{\"installmentTime\":\"2027-06-01\",\"installmentAmount\":\"50000\"}]' "
        "WHERE id=5")
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
    # 3.3) 每个业务状态各造一条演示数据（0/1/3 已有种子；补 2/4/5/6）
    #      状态 2 尽量填齐 form 新增必填 → 可直接演示「被否决→编辑重报」
    st_rows = [
        dict(bond_code='BC000004', biz_uuid='c3d3e3f3000000000000000000000002', status='2', biz_name='汉江新增被否决债券',
             customer_no='C0004', customer_name='武汉某某企业',
             ext_rating='AAA', int_rating='AA+', industry='1', start_date='2026-02-01', mature_date='2028-02-01',
             currency='人民币', orig_amount=5000000, rmb_amount=5000000, balance=5000000,
             lead_underwriter='中金公司', invest_rate='4.00', transfer_rate='1.50',
             guarantee_info='信用', agreed_usage='流动资金贷款', remark_number='P-S2-001', remark='被否决后待重报'),
        dict(bond_code='BC000005', biz_uuid='c3d3e3f3000000000000000000000004', status='4', biz_name='汉江已到期债券',
             customer_no='C0005', customer_name='武汉某某企业'),
        dict(bond_code='BC000006', biz_uuid='c3d3e3f3000000000000000000000005', status='5', biz_name='汉江已中止债券',
             customer_no='C0006', customer_name='武汉某某企业'),
        dict(bond_code='BC000007', biz_uuid='c3d3e3f3000000000000000000000006', status='6', biz_name='汉江归档债券',
             customer_no='C0007', customer_name='武汉某某企业'),
    ]
    for r in st_rows:
        assert len(r['biz_uuid']) == 32, r['biz_uuid']
        cur.execute(
            "INSERT INTO bus_bond_business (biz_uuid, bond_code, status, creator, org_name, org_code, "
            "customer_no, customer_name, biz_name, green_tech_flag, ext_rating, ext_rating_date, rating_agency, "
            "int_rating, int_rating_date, lead_underwriter, industry, customer_type, start_date, mature_date, "
            "currency, orig_amount, rmb_amount, balance, invest_rate, transfer_rate, guarantee_info, "
            "agreed_usage, remark_number, remark) "
            "VALUES (%s,%s,%s,'admin','武汉营业部','001',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) "
            "ON DUPLICATE KEY UPDATE status=VALUES(status), biz_name=VALUES(biz_name)",
            (r['biz_uuid'], r['bond_code'], r['status'],
             r.get('customer_no'), r.get('customer_name'), r.get('biz_name'),
             r.get('green_tech_flag', '3'), r.get('ext_rating'), r.get('ext_rating_date', '2026-01-10'), r.get('rating_agency', '标准普尔'),
             r.get('int_rating'), r.get('int_rating_date', '2026-01-11'), r.get('lead_underwriter'),
             r.get('industry'), r.get('customer_type', '1'), r.get('start_date', '2026-01-12'), r.get('mature_date', '2028-01-12'),
             r.get('currency', '人民币'), r.get('orig_amount'), r.get('rmb_amount'), r.get('balance'),
             r.get('invest_rate'), r.get('transfer_rate'), r.get('guarantee_info'),
             r.get('agreed_usage'), r.get('remark_number'), r.get('remark')))
    print("全状态演示数据已就绪")
    # 4) 配置复位
    cur.execute("UPDATE bus_upper_storage_config SET vat=0.060000, surcharge=0.012000, "
                "updater=NULL, update_time=NOW() WHERE id=1")
    print("config 复位行数:", cur.rowcount)
    c.close()
    print("reseed OK")

if __name__ == "__main__":
    main()