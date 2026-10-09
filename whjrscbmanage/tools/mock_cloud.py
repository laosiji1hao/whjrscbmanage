# -*- coding: utf-8 -*-
"""whjrscbmanage 本地云平台 mock：在 9058 端口实现 flow_whjrscbmanage_<code> 接口。

用途：本地浏览器端到端验证「功能完整」——云平台 226006(保存申报)/226010(ECIF查客户)/
226014(账号校验)/226007(变更申请)/226008(客户经理变更)/226009(中止) 直接落本地库。
仅用于开发/演示，不上生产。
"""
import json
import re
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pymysql

DB = dict(host="127.0.0.1", port=3306, user="root", password="123456", db="whjrscbmanage",
          charset="utf8mb4", autocommit=True)
BOND = "whjrscbmanage"


def conn():
    return pymysql.connect(**DB)


def esc(v):
    """空值 → None"""
    if v is None:
        return None
    s = str(v)
    return s if s != "" else None


def add_flow(cur, business_no, applicant_oa, flow_code, data):
    # update_time 在该表无 DEFAULT（交付 DDL 同），显式写 NOW()
    cur.execute("INSERT INTO iassist_flow_data (business_no, applicant_oa, flow_code, data, approval_status, update_time) "
                "VALUES (%s,%s,%s,%s,0,NOW())",
                (business_no, applicant_oa, flow_code, json.dumps(data, ensure_ascii=False)))


def upsert_installment(cur, bond_code, install_json, applicant_oa=None):
    """installment JSON: [{installmentTime:'YYYY-MM-DD', installmentAmount:'100'}] → bus_repayment_schedule status=2"""
    if not bond_code or not install_json:
        return
    try:
        items = json.loads(install_json)
    except Exception:
        return
    if not isinstance(items, list) or not items:
        return
    cur.execute("DELETE FROM bus_repayment_schedule WHERE bond_code=%s", (bond_code,))
    for i, it in enumerate(items, 1):
        rdate = it.get("installmentTime", "")
        amt = it.get("installmentAmount", "")
        if not rdate or amt in ("", None):
            continue
        cur.execute("INSERT INTO bus_repayment_schedule (bond_code, sort, repayment_date, repayment_amount, status) "
                    "VALUES (%s,%s,%s,%s,2)", (bond_code, i, rdate, float(amt)))


def save_business(business_id, b, op):
    cur = conn().cursor()
    if business_id in ("", "0", None):
        cur.execute("INSERT INTO bus_bond_business (bond_code, ecif_customer_no, customer_no, customer_name, biz_name, "
                    "bond_type, green_tech_flag, ext_rating, ext_rating_date, rating_agency, int_rating, int_rating_date, "
                    "industry, customer_type, start_date, mature_date, currency, orig_amount, rmb_amount, balance, "
                    "invest_rate, transfer_rate, guarantee_info, installment_flag, installment_plan, our_bank_underwrite, "
                    "agreed_usage, fund_account, fund_account_flag, supervise_account, supervise_account_flag, "
                    "drawdown_check, exercise_flag, exercise_date, remark, js_remark, js_remark_flag, inspect_freq, "
                    "inspector_post, creator, org_code, org_name, status, remark_number, lead_underwriter) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,1,%s,%s)",
                    (esc(b.get("bondCode")), esc(b.get("ecifCustomerNo")), esc(b.get("customerNo")),
                     esc(b.get("customerName")), esc(b.get("bizName")), esc(b.get("bondType")),
                     esc(b.get("greenTechFlag")), esc(b.get("extRating")), esc(b.get("extRatingDate")),
                     esc(b.get("ratingAgency")), esc(b.get("intRating")), esc(b.get("intRatingDate")),
                     esc(b.get("industry")), esc(b.get("customerType")), esc(b.get("startDate")),
                     esc(b.get("matureDate")), esc(b.get("currency")), esc(b.get("origAmount")),
                     esc(b.get("rmbAmount")), esc(b.get("balance")), esc(b.get("investRate")),
                     esc(b.get("transferRate")), esc(b.get("guaranteeInfo")), esc(b.get("installmentFlag")),
                     esc(b.get("installment")), esc(b.get("ourBankUnderwrite")), esc(b.get("agreedUsage")),
                     esc(b.get("fundAccount")), esc(b.get("fundAccountFlag")), esc(b.get("superviseAccount")),
                     esc(b.get("superviseAccountFlag")), esc(b.get("drawdownCheck")), esc(b.get("exerciseFlag")),
                     esc(b.get("exerciseDate")), esc(b.get("remark")), esc(b.get("jsRemark")),
                     esc(b.get("jsRemarkFlag")), esc(b.get("inspectFreq")), esc(b.get("inspectorPost")),
                     op, esc(b.get("orgCode")) or "", esc(b.get("orgName")) or "", esc(b.get("remarkNumber")),
                     esc(b.get("leadUnderwriter"))))
        new_id = cur.lastrowid
        cur.close()
        with conn().cursor() as c2:
            add_flow(c2, b.get("bondCode") or "", op, "biz_declare", b)
            upsert_installment(c2, b.get("bondCode"), b.get("installment"))
        return {"businessId": str(new_id)}
    # UPDATE
    fields = []
    vals = []
    mapping = {
        "bondCode": "bond_code", "ecifCustomerNo": "ecif_customer_no", "customerNo": "customer_no",
        "customerName": "customer_name", "bizName": "biz_name", "bondType": "bond_type",
        "greenTechFlag": "green_tech_flag", "extRating": "ext_rating", "extRatingDate": "ext_rating_date",
        "ratingAgency": "rating_agency", "intRating": "int_rating", "intRatingDate": "int_rating_date",
        "industry": "industry", "customerType": "customer_type", "startDate": "start_date",
        "matureDate": "mature_date", "currency": "currency", "origAmount": "orig_amount",
        "rmbAmount": "rmb_amount", "balance": "balance", "investRate": "invest_rate",
        "transferRate": "transfer_rate", "guaranteeInfo": "guarantee_info",
        "installmentFlag": "installment_flag", "ourBankUnderwrite": "our_bank_underwrite",
        "agreedUsage": "agreed_usage", "fundAccount": "fund_account", "fundAccountFlag": "fund_account_flag",
        "superviseAccount": "supervise_account", "superviseAccountFlag": "supervise_account_flag",
        "drawdownCheck": "drawdown_check", "exerciseFlag": "exercise_flag", "exerciseDate": "exercise_date",
        "remark": "remark", "jsRemark": "js_remark", "jsRemarkFlag": "js_remark_flag",
        "inspectFreq": "inspect_freq", "inspectorPost": "inspector_post", "remarkNumber": "remark_number",
        "leadUnderwriter": "lead_underwriter",
    }
    insert = b.get("installment")  # JSON → installment_plan 文本（返回给页面回显用）
    for k, col in mapping.items():
        if k in b and b[k] != "" and b[k] is not None:
            fields.append("%s=%%s" % col)
            vals.append(b[k])
    fields.append("status=1")
    fields.append("update_time=NOW()")
    vals.append(int(business_id))
    with conn().cursor() as cur:
        if fields:
            cur.execute("UPDATE bus_bond_business SET %s WHERE id=%%s" % ", ".join(fields), vals)
        add_flow(cur, b.get("bondCode") or "", op, "biz_update", b)
        if insert:
            cur.execute("UPDATE bus_bond_business SET installment_plan=%s WHERE id=%s", (insert, int(business_id)))
            upsert_installment(cur, b.get("bondCode"), insert)
        row = None
        if b.get("bondCode"):
            cur.execute("SELECT id, bond_code FROM bus_bond_business WHERE id=%s", (int(business_id),))
            row = cur.fetchone()
    return {"businessId": str(business_id)}


def change_business(business_id, b, op):
    mapping = {
        "bondCode": "bond_code", "ecifCustomerNo": "ecif_customer_no", "customerNo": "customer_no",
        "customerName": "customer_name", "bizName": "biz_name", "bondType": "bond_type",
        "bizType": "biz_type", "greenTechFlag": "green_tech_flag", "extRating": "ext_rating",
        "extRatingDate": "ext_rating_date", "ratingAgency": "rating_agency", "intRating": "int_rating",
        "intRatingDate": "int_rating_date", "industry": "industry", "customerType": "customer_type",
        "alertCustomer": "alert_customer", "startDate": "start_date", "matureDate": "mature_date",
        "currency": "currency", "origAmount": "orig_amount", "rmbAmount": "rmb_amount", "balance": "balance",
        "investRate": "invest_rate", "transferRate": "transfer_rate", "guaranteeInfo": "guarantee_info",
        "breachFlag": "breach_flag", "fiveLevelClass": "five_level_class", "fundUsedFlag": "fund_used_flag",
        "fundUsedUp": "fund_used_up", "installmentFlag": "installment_flag",
        "ourBankUnderwrite": "our_bank_underwrite", "manageLine": "manage_line", "dept": "dept",
        "agreedUsage": "agreed_usage", "fundAccount": "fund_account", "fundAccountFlag": "fund_account_flag",
        "superviseAccount": "supervise_account", "superviseAccountFlag": "supervise_account_flag",
        "drawdownCheck": "drawdown_check", "isOriginalAm": "is_original_am", "exerciseFlag": "exercise_flag",
        "exerciseDate": "exercise_date", "remark": "remark", "jsRemark": "js_remark",
        "jsRemarkFlag": "js_remark_flag", "inspectFreq": "inspect_freq", "inspectorPost": "inspector_post",
        "leadUnderwriter": "lead_underwriter", "isPassage": "is_passage", "passageAmount": "passage_amount",
        "upperStorageRate": "upper_storage_rate", "remarkNumber": "remark_number",
    }
    fields, vals = [], []
    for k, col in mapping.items():
        if k in b and b[k] != "" and b[k] is not None:
            fields.append("%s=%%s" % col)
            vals.append(b[k])
    fields.append("update_time=NOW()")
    vals.append(int(business_id))
    with conn().cursor() as cur:
        if fields:
            cur.execute("UPDATE bus_bond_business SET %s WHERE id=%%s" % ", ".join(fields), vals)
        if b.get("installment"):
            cur.execute("UPDATE bus_bond_business SET installment_plan=%s WHERE id=%s",
                        (b.get("installment"), int(business_id)))
            cur.execute("SELECT bond_code FROM bus_bond_business WHERE id=%s", (int(business_id),))
            row = cur.fetchone()
            upsert_installment(cur, row[0] if row else None, b.get("installment"))
        flow = dict(b)
        flow.pop("operate", None)
        add_flow(cur, b.get("bondCode") or "", op, "biz_change", b)
    return {"businessId": str(business_id)}


def change_manager(business_id, b, op):
    with conn().cursor() as cur:
        cur.execute("SELECT creator, org_code, org_name FROM bus_bond_business WHERE id=%s", (int(business_id),))
        row = cur.fetchone()
        old_handler = row[0] if row else None
        old_org_code = row[1] if row else None
        old_org_name = row[2] if row else None
        cur.execute("UPDATE bus_bond_business SET creator=%s, org_code=%s, org_name=%s, update_time=NOW() WHERE id=%s",
                    (b.get("newCreator"), b.get("newOrgCode"), b.get("newOrgName"), int(business_id)))
        cur.execute("INSERT INTO bus_manager_change_history (business_id, old_handler, old_org_code, old_org_name, "
                    "new_handler, new_org_code, new_org_name, change_reason, applicant_oa) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    (int(business_id), old_handler or "", old_org_code or "", old_org_name,
                     b.get("newCreator"), b.get("newOrgCode"), b.get("newOrgName"),
                     b.get("changeReason"), b.get("creator") or op))
        add_flow(cur, "", op, "biz_mgr_change", b)
    return {}


def terminate_business(bond_code, op, updater_type):
    with conn().cursor() as cur:
        cur.execute("UPDATE bus_bond_business SET status=5, termination_reason='中止', update_time=NOW() "
                    "WHERE bond_code=%s", (bond_code,))
        add_flow(cur, bond_code, op, "biz_terminate", {"bondCode": bond_code, "terminator": op,
                                                       "updaterType": updater_type})
    return {}


def handle(data):
    body = (data.get("iibs") or {}).get("req", {}).get("body", {})
    op = body.get("operator", "admin")
    code = data.get("code", "")
    if code == "226010":  # ECIF 客户查询
        cust_no = body.get("custNo")
        name = None
        if cust_no:
            with conn().cursor() as cur:
                cur.execute("SELECT customer_name FROM bus_bond_business WHERE customer_no=%s LIMIT 1", (cust_no,))
                row = cur.fetchone()
                name = row[0] if row else None
        return {"ecifCustomerNo": ("ECIF_" + cust_no) if cust_no and name else "",
                "customerName": name or ""}
    if code == "226014":  # 账号可用性
        acct = body.get("acctNo", "")
        if acct == "BAD123":
            return {"status": "AS98", "statusTxt": "账号不存在"}
        return {"status": "AS00", "statusTxt": "可用"}
    if code == "226006":  # 保存/更新申报
        return save_business(body.get("businessId"), body, op)
    if code == "226007":  # 变更申请
        return change_business(body.get("businessId"), body, op)
    if code == "226008":  # 客户经理变更
        return change_manager(body.get("businessId"), body, op)
    if code == "226009":  # 中止
        return terminate_business(body.get("bondCode"), op, body.get("updaterType"))
    return {"error": "unknown code " + code}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Requested-With")
        self.send_header("Access-Control-Max-Age", "86400")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(n) if n else b"{}"
        try:
            req = json.loads(raw.decode("utf-8") or "{}")
        except Exception:
            req = {}
        url = self.path
        m = re.search(r"flow_whjrscbmanage_(\d+)$", url)
        code = m.group(1) if m else ""
        req["code"] = code
        try:
            body = handle(req)
            resp = {"iibs": {"resp": {"head": {"respCode": "00000", "respMsg": "success"}, "body": body}}}
            status = 200
        except Exception as e:
            resp = {"iibs": {"resp": {"head": {"respCode": "99999", "respMsg": str(e)}, "body": {}}}}
            status = 500
        data = json.dumps(resp, ensure_ascii=False)
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json;charset=UTF-8")
        self.send_header("Content-Length", str(len(data.encode("utf-8"))))
        self.end_headers()
        self.wfile.write(data.encode("utf-8"))


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9058
    srv = HTTPServer(("0.0.0.0", port), Handler)
    print("mock cloud listening on %s" % port, flush=True)
    srv.serve_forever()