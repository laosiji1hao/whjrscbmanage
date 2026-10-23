#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""226007 生产者侧集成测试（本地真实后端）：
不经过 FR，直接 POST 真实后端 226007，检查发给 i助手的 update_context。
用例：
  U1 只改其他字段、未动计划 -> update_context 不得包含「还款计划由」
  U2 修改计划 -> 必须包含「还款计划由[...]变为[...]」
  U3 清空计划 -> 必须包含「变为[]」
前置：后端已启动 9059（本地库、iassist.enabled=false）。
"""
import json
import sys
import time

import pymysql
import requests

MASTER = dict(host="127.0.0.1", port=3306, user="root", password="123456", charset="utf8mb4", db="whjrscbmanage")
URL = "http://127.0.0.1:9059/whjrscbmanage/flowservice/json/flow_whjrscbmanage_226007"
UUID = "ITCTX00000000000000000000000001"
BOND = "ITCTX001"
PLAN1 = '[{"installmentTime":"2027-01-01","installmentAmount":"100"}]'
PLAN2 = '[{"installmentTime":"2027-02-01","installmentAmount":"200"}]'

results = []
def check(name, ok, detail=""):
    results.append(ok); print(("[OK] " if ok else "[X] ") + name + ((" | " + detail) if detail else ""))

def db():
    return pymysql.connect(**MASTER, autocommit=True)

def seed(plan_json):
    c = db(); cur = c.cursor()
    cur.execute("DELETE FROM iassist_flow_data WHERE business_no=%s", (UUID,))
    cur.execute("DELETE FROM bus_bond_business WHERE biz_uuid=%s", (UUID,))
    cur.execute("""INSERT INTO bus_bond_business
      (biz_uuid,bond_code,ecif_customer_no,customer_no,customer_name,biz_name,bond_type,green_tech_flag,
       ext_rating,ext_rating_date,rating_agency,int_rating,int_rating_date,lead_underwriter,is_passage,
       upper_storage_rate,alert_customer,biz_type,remark_number,industry,customer_type,start_date,mature_date,
       currency,orig_amount,rmb_amount,balance,invest_rate,transfer_rate,guarantee_info,breach_flag,
       five_level_class,fund_used_flag,fund_used_up,installment_flag,installment_plan,our_bank_underwrite,
       manage_line,dept,agreed_usage,fund_account_flag,supervise_account_flag,is_original_am,exercise_flag,
       remark,js_remark_flag,inspect_freq,inspector_post,status,creator,org_code,org_name)
      VALUES (%s,%s,'00000000000000001','C0001','湖北某某企业','IT变更上下文测试','0','0',
       'AAA','2026-01-01','标准普尔','AA+','2026-01-02','中金公司','0',
       1.0,'0','0','P-001','1','0','2026-01-01','2027-01-01',
       '人民币',100,100,100,4.0,1.5,'0','0',
       '正常一档','0','0','1',%s,'1',
       '金融市场部','0','流动资金贷款','0','0','0','0',
       'old','0','3','客户经理',3,'admin','001','武汉营业部')""", (UUID, BOND, plan_json))
    c.close()

def dto(plan, flag, remark):
    return {
        "businessId": UUID, "bondCode": BOND, "ecifCustomerNo": "00000000000000001", "customerNo": "C0001",
        "customerName": "湖北某某企业", "bizName": "IT变更上下文测试", "bondType": "0", "greenTechFlag": "0",
        "extRating": "AAA", "extRatingDate": "2026-01-01", "ratingAgency": "标准普尔", "intRating": "AA+",
        "intRatingDate": "2026-01-02", "leadUnderwriter": "中金公司", "isPassage": "0",
        "upperStorageRate": 1.0, "alertCustomer": "0", "bizType": "0", "remarkNumber": "P-001",
        "industry": "1", "customerType": "0", "startDate": "2026-01-01", "matureDate": "2027-01-01",
        "currency": "人民币", "origAmount": 100, "rmbAmount": 100, "balance": 100,
        "investRate": 4.0, "transferRate": 1.5, "guaranteeInfo": "0", "breachFlag": "0",
        "fiveLevelClass": "正常一档", "fundUsedFlag": "0", "fundUsedUp": "0",
        "installmentFlag": flag, "installment": plan, "ourBankUnderwrite": "1", "manageLine": "金融市场部",
        "dept": "0", "agreedUsage": "流动资金贷款", "fundAccountFlag": "0", "superviseAccountFlag": "0",
        "isOriginalAm": "0", "exerciseFlag": "0", "remark": remark, "jsRemarkFlag": "0",
        "inspectFreq": "3", "inspectorPost": "客户经理", "operator": "admin", "updaterType": "0"
    }

def post_226007(body):
    payload = {"iibs": {"req": {"body": body}}}
    r = requests.post(URL, headers={"Content-Type": "application/json"}, data=json.dumps(payload, ensure_ascii=False), timeout=30)
    try:
        return r.json()
    except Exception:
        return {"raw": r.text[:200]}

def latest_context():
    c = db(); cur = c.cursor()
    cur.execute("SELECT data FROM iassist_flow_data WHERE business_no=%s ORDER BY id DESC LIMIT 1", (UUID,))
    row = cur.fetchone(); c.close()
    if not row:
        return None
    for it in json.loads(row[0]).get("data", []):
        if it.get("fieldName") == "update_context":
            return it.get("value") or ""
    return ""

def resp_ok(resp):
    try:
        return resp["iibs"]["resp"]["head"]["respCode"] == "00000"
    except Exception:
        return False

def main():
    # U1：只改 remark，计划不变
    seed(PLAN1)
    r = post_226007(dto(PLAN1, "1", "new"))
    ctx = latest_context()
    check("U1 226007 调用成功", resp_ok(r), json.dumps(r, ensure_ascii=False)[:160])
    check("U1 未动计划时不出现「还款计划由」", ctx is not None and "还款计划由" not in ctx, "ctx=" + repr(ctx))
    check("U1 其他字段变更已记录", ctx is not None and "批复管理要求" in ctx, "ctx=" + repr(ctx))

    # U2：修改计划
    seed(PLAN1)
    r = post_226007(dto(PLAN2, "1", "old"))
    ctx = latest_context()
    check("U2 226007 调用成功", resp_ok(r), json.dumps(r, ensure_ascii=False)[:160])
    check("U2 改计划时出现「还款计划由」", ctx is not None and "还款计划由" in ctx, "ctx=" + repr(ctx))

    # U3：清空计划
    seed(PLAN1)
    r = post_226007(dto("", "0", "old"))
    ctx = latest_context()
    check("U3 226007 调用成功", resp_ok(r), json.dumps(r, ensure_ascii=False)[:160])
    check("U3 清空计划时「变为[]」", ctx is not None and "还款计划由" in ctx and "变为[]" in ctx, "ctx=" + repr(ctx))

    # cleanup
    c = db(); cur = c.cursor()
    cur.execute("DELETE FROM iassist_flow_data WHERE business_no=%s", (UUID,))
    cur.execute("DELETE FROM bus_bond_business WHERE biz_uuid=%s", (UUID,))
    c.close()
    bad = results.count(False)
    print("\n生产者侧测试: PASS=%d FAIL=%d" % (results.count(True), bad))
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()