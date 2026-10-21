#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""本地 flowservice 网关 v3（纯透传）：真实后端自带 JsonStructureFilter 负责 iibs 拆包，
本网关不拆包，直接把 myFR.callCloud 的原始报文原样转发到真实后端(9059)，透传响应。
本地兜底：仅 226010(ECIF 查客户) 外部核心不可达 → 改为查本地库回填（同 mock 口径）。
仅本地验证「FR 页面 → 真实后端」链路用，绝不进内网包。"""
import json
import sys
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, HTTPServer

import pymysql

BACK = "http://127.0.0.1:9059"
DB = dict(host="127.0.0.1", port=3306, user="root", password="123456", charset="utf8mb4", db="whjrscbmanage", autocommit=True)


def local_ecif(cust_no):
    try:
        c = pymysql.connect(**DB)
        cur = c.cursor()
        cur.execute("SELECT customer_name FROM bus_bond_business WHERE customer_no=%s LIMIT 1", (cust_no,))
        row = cur.fetchone()
        name = row[0] if row else ""
        return {"ecifCustomerNo": ("ECIF_" + cust_no) if name else "",
                "customerName": name or ""}
    except Exception as e:
        return {"ecifCustomerNo": "", "customerName": "", "err": str(e)}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Requested-With")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(n) if n else b"{}"

        # 226010 本地兜底：ECIF 客户查询（外部核心不可达）
        if "flow_whjrscbmanage_226010" in self.path:
            try:
                req = json.loads(raw.decode("utf-8") or "{}")
                cust = (req.get("iibs") or {}).get("req", {}).get("body", {}).get("custNo", "")
            except Exception:
                cust = ""
            data = local_ecif(cust)
            resp = json.dumps({"iibs": {"resp": {"head": {"respCode": "00000", "respMsg": "success"}, "body": data}}},
                              ensure_ascii=False).encode("utf-8")
        else:
            # 其余接口：原样转发整包（不拆包，后端 JsonStructureFilter 自己拆）
            up = urllib.request.Request(
                BACK + self.path, data=raw,
                headers={"Content-Type": "application/json;charset=UTF-8"}, method="POST")
            try:
                r = urllib.request.urlopen(up, timeout=120)
                resp = r.read()
            except urllib.error.HTTPError as e:
                resp = e.read()
            except Exception as e:
                resp = json.dumps({"iibs": {"resp": {"head": {"respCode": "99999", "respMsg": str(e)[:200]}, "body": {}}}},
                                  ensure_ascii=False).encode("utf-8")

        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "application/json;charset=UTF-8")
        self.send_header("Content-Length", str(len(resp)))
        self.end_headers()
        self.wfile.write(resp)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9058
    print("flow gateway v3 on %s -> %s（透传 + ECIF本地兜底）" % (port, BACK), flush=True)
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()