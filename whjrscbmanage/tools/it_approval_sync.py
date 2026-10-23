#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""真实后端审批回同步集成测试（本地跑）：
造 busi_mobile 审批表数据 + iassist_flow_data 待批流 → 触发真实 xxl-job handler
assistedApprovalSync → 查 whjrscbmanage 库断言 → 清理。

前置：真实后端已启动（mvn spring-boot:run，端口 9059；xxl executor 9999），
      application.yml 为本地库、iassist.enabled=false。
用法：python tools/it_approval_sync.py
"""
import json
import sys
import time

import pymysql
import requests

MASTER = dict(host="127.0.0.1", port=3306, user="root", password="123456", charset="utf8mb4", db="whjrscbmanage")
MOBILE = dict(host="127.0.0.1", port=3306, user="root", password="123456", charset="utf8mb4", db="busi_mobile")
EXECUTOR = "http://127.0.0.1:9999/run"
TOKEN = "Xxljob$%^&1234"

UPD_UUID = "ITUUIDUPD00000000000000000000001"
MGR_UUID = "ITUUIDMGR00000000000000000000001"
TRM_UUID = "ITUUIDTRM00000000000000000000001"
REJ_UUID = "ITUUIDREJ00000000000000000000001"
ENM_UUID = "ITUUIDENM00000000000000000000001"
ALL_UUIDS = (UPD_UUID, MGR_UUID, TRM_UUID, REJ_UUID, ENM_UUID)
ALL_FLOW_NOS = ALL_UUIDS + ("ITNEW001",)

results = []
def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("[OK] " if ok else "[X] ") + name + ((" | " + detail) if detail else ""))


def master():
    return pymysql.connect(**MASTER, autocommit=True)

def mobile():
    return pymysql.connect(**MOBILE, autocommit=True)

def cleanup():
    c = master(); cur = c.cursor()
    cur.execute("DELETE FROM bus_manager_change_history WHERE business_id IN (%s,%s,%s)", (UPD_UUID, MGR_UUID, TRM_UUID))
    cur.execute("DELETE FROM iassist_flow_data WHERE business_no IN (%s,%s,%s,%s,%s,%s)",
                (UPD_UUID, MGR_UUID, TRM_UUID, REJ_UUID, ENM_UUID, "ITNEW001"))
    cur.execute("DELETE FROM bus_bond_business WHERE biz_uuid IN (%s,%s,%s,%s,%s) OR bond_code LIKE 'ITNEW%%'",
                (UPD_UUID, MGR_UUID, TRM_UUID, REJ_UUID, ENM_UUID))
    c.close()
    m = mobile(); cur = m.cursor()
    for t in ("add_new_business", "update_business_accountmanager", "update_business_handler_accountmanager", "terminate_business"):
        cur.execute("DELETE FROM " + t + " WHERE bond_code LIKE 'IT%%'")
    m.close()


def ensure_schema():
    """本地测试环境自包含：补齐 mapper 需要、但本地 busi_mobile 缺少的列/表（幂等）。"""
    m = mobile(); cur = m.cursor()
    def has_col(t, col):
        cur.execute("SHOW COLUMNS FROM " + t + " LIKE %s", (col,)); return cur.fetchone() is not None
    def has_table(t):
        cur.execute("SHOW TABLES LIKE %s", (t,)); return cur.fetchone() is not None
    add_cols = {
        "add_new_business": [("origin_amount", "varchar(32)"), ("remark_number", "varchar(60)"),
                             ("lead_underwriter", "varchar(255)"), ("is_passage", "varchar(10)"),
                             ("passage_amount", "varchar(32)")],
        "update_business_accountmanager": [("update_context", "text"), ("approve_status", "varchar(60)")],
        "update_business_handler_accountmanager": [("approve_status", "varchar(60)")],
    }
    for t, cols in add_cols.items():
        if not has_table(t):
            continue
        for col, typ in cols:
            if not has_col(t, col):
                cur.execute("ALTER TABLE %s ADD COLUMN %s %s NULL" % (t, col, typ))
                print("schema: add %s.%s" % (t, col))
    if not has_table("terminate_business"):
        cur.execute("CREATE TABLE terminate_business (ybid varchar(60) NULL, bond_code varchar(60) NULL, "
                    "approve_status varchar(60) NULL, approve_info text NULL)")
        print("schema: create terminate_business")
    m.close()


def add_flow(flow_code, business_no, applicant="admin"):
    c = master(); cur = c.cursor()
    cur.execute("INSERT INTO iassist_flow_data (business_no,applicant_oa,flow_code,data,approval_status,update_time) "
                "VALUES (%s,%s,%s,'{}',0,NOW())", (business_no, applicant, flow_code))
    yid = cur.lastrowid; c.close(); return yid


def seed():
    # 业务行（变更/换经理/中止）
    c = master(); cur = c.cursor()
    for uid, bond, name, creator in [
        (UPD_UUID, "ITUPD001", "IT变更计划测试", "admin"),
        (MGR_UUID, "ITMGR001", "IT换经理测试", "admin"),
        (TRM_UUID, "ITTRM001", "IT中止测试", "admin"),
        (REJ_UUID, "ITREJ001", "IT变更否决测试", "admin"),
        (ENM_UUID, "ITENM001", "IT变更枚举测试", "admin"),
    ]:
        cur.execute("DELETE FROM bus_bond_business WHERE biz_uuid=%s", (uid,))
        plan = '[{"installmentTime":"2027-01-01","installmentAmount":"100"}]' if uid == REJ_UUID else None
        cur.execute("INSERT INTO bus_bond_business (biz_uuid,bond_code,biz_name,status,creator,org_code,org_name,installment_flag,installment_plan) "
                    "VALUES (%s,%s,%s,3,%s,'001','武汉营业部','0',%s)", (uid, bond, name, creator, plan))
    c.close()

    # A. 新增审批（宽字段 + 中文标签）
    y_new = add_flow("flow_001", "ITNEW001")
    m = mobile(); cur = m.cursor()
    cur.execute("DELETE FROM add_new_business WHERE bond_code='ITNEW001'")
    long_usage = "用" * 300
    cur.execute("""INSERT INTO add_new_business
        (ybid,bond_code,bond_type,industry,approve_status,biz_name,customer_no,customer_name,ecif_customer_no,
         green_tech_flag,installment_flag,agreed_usage,handler,org_code,org_name,remark_number,lead_underwriter,
         is_passage,passage_amount,origin_amount,initial_amount,balance,invest_rate,transfer_rate)
        VALUES (%s,%s,%s,%s,'成功',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (y_new, "ITNEW001", "标准化业务", "信息传输、软件和信息技术服务业", "IT新增测试", "C0001", "湖北某某企业",
         "00000000000000001", "绿色", "否", long_usage, "admin", "001", "武汉营业部", "P-IT-001", "中金公司",
         "0", "0", "1000000", "1000000", "1000000", "4.0", "1.5"))

    # B. 变更审批：原计划为空 → 新增计划
    y_upd = add_flow("flow_002", UPD_UUID)
    cur.execute("DELETE FROM update_business_accountmanager WHERE bond_code='ITUPD001'")
    cur.execute("""INSERT INTO update_business_accountmanager
        (ybid,bond_code,approve_status,update_context,updator,updator_org_code,updator_org_name)
        VALUES (%s,%s,'成功',%s,'admin','001','武汉营业部')""",
        (y_upd, "ITUPD001", "还款计划由[]变为[第1期 2027-03-01 还款1000000元]"))

    # C. 换经理审批
    y_mgr = add_flow("flow_004", MGR_UUID)
    cur.execute("DELETE FROM update_business_handler_accountmanager WHERE bond_code='ITMGR001'")
    cur.execute("""INSERT INTO update_business_handler_accountmanager
        (ybid,bond_code,updator_type,old_handler,old_org_code,old_org_name,new_handler,new_org_code,new_org_name,
         approve_status,approve_info)
        VALUES (%s,%s,'0','admin','001','武汉营业部','cm001','00101','江汉支行','成功','')""", (y_mgr, "ITMGR001"))

    # D. 中止审批
    y_trm = add_flow("flow_006", TRM_UUID)
    cur.execute("DELETE FROM terminate_business WHERE bond_code='ITTRM001'")
    cur.execute("INSERT INTO terminate_business (ybid,bond_code,approve_status) VALUES (%s,%s,'成功')", (y_trm, "ITTRM001"))

    # E. 变更审批被否决（计划不应生效、主表计划不变、旧表计划作废）
    y_rej = add_flow("flow_002", REJ_UUID)
    cur.execute("DELETE FROM update_business_accountmanager WHERE bond_code='ITREJ001'")
    cur.execute("""INSERT INTO update_business_accountmanager
        (ybid,bond_code,approve_status,update_context,updator,updator_org_code,updator_org_name)
        VALUES (%s,%s,'失败',%s,'admin','001','武汉营业部')""",
        (y_rej, "ITREJ001", "还款计划由[第1期 2027-01-01 还款100元]变为[第1期 2027-02-01 还款200元]"))

    # F. 变更审批中修改枚举字段（行业/标债类型）→ 应写编码而非中文
    y_enm = add_flow("flow_002", ENM_UUID)
    cur.execute("DELETE FROM update_business_accountmanager WHERE bond_code='ITENM001'")
    cur.execute("""INSERT INTO update_business_accountmanager
        (ybid,bond_code,approve_status,update_context,updator,updator_org_code,updator_org_name)
        VALUES (%s,%s,'成功',%s,'admin','001','武汉营业部')""",
        (y_enm, "ITENM001", "行业分类由制造业变为信息传输、软件和信息技术服务业;标债类型由标债变为非标"))
    m.close()


def trigger_job():
    body = {"jobId": 1, "executorHandler": "assistedApprovalSync", "executorParams": "",
            "executorBlockStrategy": "SERIAL_EXECUTION", "executorTimeout": 0, "logId": 1,
            "logDateTime": int(time.time() * 1000), "glueType": "BEAN", "glueSource": "",
            "glueUpdatetime": 0, "broadcastIndex": 0, "broadcastTotal": 1}
    r = requests.post(EXECUTOR, headers={"XXL-JOB-ACCESS-TOKEN": TOKEN, "Content-Type": "application/json"},
                      data=json.dumps(body), timeout=20)
    return r.status_code, r.text[:300]


def wait_done(timeout=60):
    end = time.time() + timeout
    placeholders = ",".join(["%s"] * len(ALL_FLOW_NOS))
    while time.time() < end:
        c = master(); cur = c.cursor()
        cur.execute("SELECT COUNT(*) FROM iassist_flow_data WHERE approval_status=0 AND business_no IN (" + placeholders + ")",
                    ALL_FLOW_NOS)
        left = cur.fetchone()[0]; c.close()
        if left == 0:
            return True
        time.sleep(2)
    return False


def assert_all():
    c = master(); cur = c.cursor()
    # A 新增
    cur.execute("SELECT bond_type,industry,status,CHAR_LENGTH(agreed_usage),creator FROM bus_bond_business WHERE bond_code='ITNEW001'")
    r = cur.fetchone()
    check("A 新增落库", r is not None, str(r))
    if r:
        check("A bond_type 中文标签→0", r[0] == "0", "bond_type=" + str(r[0]))
        check("A industry 18类→17", r[1] == "17", "industry=" + str(r[1]))
        check("A status=生效中(3)", str(r[2]) == "3", "status=" + str(r[2]))
        check("A agreed_usage 宽字段截断到255", r[3] == 255, "len=" + str(r[3]))
        check("A creator=handler", r[4] == "admin", "creator=" + str(r[4]))
    # B 变更计划
    cur.execute("SELECT installment_plan,status FROM bus_bond_business WHERE biz_uuid=%s", (UPD_UUID,))
    r = cur.fetchone()
    if r:
        try:
            plan = json.loads(r[0] or "[]")
        except Exception:
            plan = None
        check("B 审批后主表 installment_plan 为JSON", isinstance(plan, list) and len(plan) == 1,
              "value=" + repr(r[0]))
        if plan:
            check("B JSON 字段正确", plan[0].get("installmentTime") == "2027-03-01"
                  and str(plan[0].get("installmentAmount")) == "1000000", str(plan[0]))
        check("B status 保持生效中(3)", str(r[1]) == "3", "status=" + str(r[1]))
    else:
        check("B 变更业务存在", False)
    # C 换经理
    cur.execute("SELECT creator,org_code,org_name FROM bus_bond_business WHERE biz_uuid=%s", (MGR_UUID,))
    r = cur.fetchone()
    check("C 换经理后 creator=cm001", r is not None and r[0] == "cm001", str(r))
    cur.execute("SELECT business_id,new_handler FROM bus_manager_change_history WHERE business_id=%s ORDER BY id DESC LIMIT 1", (MGR_UUID,))
    h = cur.fetchone()
    check("C 历史记录 business_id=biz_uuid", h is not None and h[0] == MGR_UUID, str(h))
    # D 中止
    cur.execute("SELECT status FROM bus_bond_business WHERE biz_uuid=%s", (TRM_UUID,))
    r = cur.fetchone()
    check("D 中止后 status=5", r is not None and str(r[0]) == "5", str(r))
    # E 变更否决：主表计划不变、状态保持 3、旧表审批中计划作废
    cur.execute("SELECT installment_plan,status FROM bus_bond_business WHERE biz_uuid=%s", (REJ_UUID,))
    r = cur.fetchone()
    check("E 否决后 status 保持3", r is not None and str(r[1]) == "3", str(r))
    check("E 否决后主表计划不变", r is not None and r[0] == '[{"installmentTime":"2027-01-01","installmentAmount":"100"}]',
          repr(r[0]) if r else "None")
    # F 变更中修改枚举字段：编码入库
    cur.execute("SELECT industry,bond_type FROM bus_bond_business WHERE biz_uuid=%s", (ENM_UUID,))
    r = cur.fetchone()
    check("F 变更行业→编码17", r is not None and r[0] == "17", str(r))
    check("F 变更标债类型→编码1", r is not None and r[1] == "1", str(r))
    c.close()


def main():
    ensure_schema()
    cleanup()
    try:
        seed()
    except Exception as e:
        print("SEED ERROR:", e); cleanup(); sys.exit(1)
    code, text = trigger_job()
    print("TRIGGER", code, text)
    if not wait_done():
        print("JOB 未在超时内处理完（仍有待批流）")
    assert_all()
    bad = [x for x in results if not x[1]]
    cleanup()
    print("\n集成测试: PASS=%d FAIL=%d" % (len(results) - len(bad), len(bad)))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()