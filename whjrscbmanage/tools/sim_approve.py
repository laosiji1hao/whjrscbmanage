#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""i助手审批模拟：扮演 CommonJob 定时任务，按审批流类型回同步业务状态。

用法（在 whjrscbmanage 目录下运行）：
    python tools/sim_approve.py 通过|否决 <债券编号|apply_no> [--biz_type <码> --dept <码> --is_passage 0|1 --passage_amount <金额>]

按待批审批流类型分支：
- biz_declare / biz_update（新增申报 / 编辑后重新申报）：真实 i助手审批时补填
  业务品种/对应处室/是否通道费/通道费金额，
  「通过」必带这 4 项（写入 busi_mobile.mock_approval_new → approve_status='成功'）→ 本地 审核中(1)→生效中(3)、
  写入 4 项 + 计算上存利率 + 补 8 项默认 + 审批流通过 + 同号其它审核中草稿置退休(6)；
  「否决」→ 本地 新增审核失败(2)、审批流否决。
- biz_change / biz_mgr_change（变更/换经理）：「通过」→ 该审批流置通过（解锁，业务保持生效中）；
  「否决」→ 审批流否决（业务保持原状）。
- biz_terminate（中止）：「通过」→ 审批流通过 + 业务→已中止(5)；「否决」→ 审批流否决（保持生效中）。
"""
import argparse
import sys

import pymysql

DB = dict(host="127.0.0.1", port=3306, user="root", password="123456", charset="utf8mb4", autocommit=True)


def main():
    ap = argparse.ArgumentParser(description='i助手审批模拟')
    ap.add_argument('action', choices=['通过', '否决'])
    ap.add_argument('key', help='债券编号 或 apply_no')
    ap.add_argument('--biz_type', help='业务品种(码0~12)，新增通过必填')
    ap.add_argument('--dept', help='对应处室(码0~4)，新增通过必填')
    ap.add_argument('--is_passage', help='是否有通道费 0/1，新增通过必填')
    ap.add_argument('--passage_amount', help='通道费金额，新增通过必填')
    a = ap.parse_args()

    c = pymysql.connect(**DB)
    cur = c.cursor()

    cur.execute("SELECT id, bond_code, biz_uuid, status FROM whjrscbmanage.bus_bond_business "
                "WHERE bond_code=%s OR apply_no=%s ORDER BY status=1 DESC, id DESC LIMIT 1", (a.key, a.key))
    brow = cur.fetchone()
    if not brow:
        print('[X] 未在 bus_bond_business 找到该业务（' + a.key + '）'); sys.exit(1)
    bid, bcode, buuid, bstatus = brow

    # 找待批审批流（approval_status=0）
    cur.execute("SELECT id, flow_code FROM whjrscbmanage.iassist_flow_data WHERE business_no=%s AND approval_status=0 ORDER BY id LIMIT 1", (bcode,))
    flow = cur.fetchone()
    flow_code = flow[1] if flow else None

    if not flow:
        print('[X] 该业务没有待批审批流，无需审批（或先走业务池操作发起申请）'); sys.exit(2)

    # ── biz_declare / biz_update：新增申报（含编辑后重新申报）审批 ──
    if flow_code in ('biz_declare', 'biz_update'):
        if a.action == '通过':
            for f in ('biz_type', 'dept', 'is_passage', 'passage_amount'):
                if getattr(a, f) is None:
                    print('[X] 新增「通过」必须带 i助手补填的 4 项：--biz_type --dept --is_passage --passage_amount'); sys.exit(1)
            float(a.passage_amount)
            # 1) 写 busi_mobile 模拟审批表（有则更新，无则插入）
            cur.execute("SELECT id FROM busi_mobile.mock_approval_new WHERE bond_code=%s OR biz_uuid=%s LIMIT 1", (bcode, buuid))
            prop = cur.fetchone()
            if prop:
                cur.execute("UPDATE busi_mobile.mock_approval_new SET biz_type=%s, dept=%s, is_passage=%s, passage_amount=%s, approve_status='成功' WHERE id=%s",
                            (a.biz_type, a.dept, a.is_passage, a.passage_amount, prop[0]))
            else:
                cur.execute("INSERT INTO busi_mobile.mock_approval_new (bond_code, biz_uuid, biz_type, dept, is_passage, passage_amount, approve_status) "
                            "VALUES (%s,%s,%s,%s,%s,%s,'成功')",
                            (bcode, buuid, a.biz_type, a.dept, a.is_passage, a.passage_amount))
            # 2) 回同步本地：审核中→生效中 + 4项 + 上存利率 + 8项默认
            cur.execute("SELECT invest_rate FROM whjrscbmanage.bus_bond_business WHERE id=%s", (bid,))
            r_inv = cur.fetchone()
            cur.execute("SELECT coupon_rate, vat, surcharge FROM whjrscbmanage.bus_upper_storage_config WHERE id=1")
            cfg = cur.fetchone()
            coupon, vat, sur = float(cfg[0] or 0), float(cfg[1] or 0), float(cfg[2] or 0)
            inv = float(r_inv[0] or 0) if r_inv and r_inv[0] else 0
            upper = round(inv - vat - sur - float(a.passage_amount), 6) if str(a.is_passage) == '1' else round(coupon - vat - sur, 6)
            cur.execute("UPDATE whjrscbmanage.bus_bond_business SET status=3, biz_type=%s, dept=%s, is_passage=%s, passage_amount=%s, upper_storage_rate=%s, "
                        "alert_customer='0', breach_flag='0', five_level_class='正常一档', manage_line='金融市场部', "
                        "fund_used_flag='0', fund_used_up='0', is_original_am='0', inspector_post='客户经理', update_time=NOW() WHERE id=%s",
                        (a.biz_type, a.dept, a.is_passage, a.passage_amount, upper, bid))
            # 3) 审批流通过 + 同号其它审核中草稿退休
            cur.execute("UPDATE whjrscbmanage.iassist_flow_data SET approval_status=1 WHERE id=%s", (flow[0],))
            cur.execute("UPDATE whjrscbmanage.bus_bond_business SET status=6 WHERE bond_code=%s AND status=1 AND id<>%s", (bcode, bid))
            print(f'[OK] 新增通过：id={bid} bond_code={bcode} 审核中→生效中(3)，4项={a.biz_type}/{a.dept}/{a.is_passage}/{a.passage_amount} 上存={upper}')
        else:  # 否决
            cur.execute("UPDATE busi_mobile.mock_approval_new SET approve_status='失败' WHERE bond_code=%s OR biz_uuid=%s", (bcode, buuid))
            cur.execute("UPDATE whjrscbmanage.bus_bond_business SET status=2, update_time=NOW() WHERE id=%s", (bid,))
            cur.execute("UPDATE whjrscbmanage.iassist_flow_data SET approval_status=2 WHERE id=%s", (flow[0],))
            print(f'[OK] 新增否决：id={bid} bond_code={bcode} 审核中→新增审核失败(2)')

    # ── biz_change / biz_mgr_change：变更 / 换经理 ──
    elif flow_code in ('biz_change', 'biz_mgr_change'):
        if a.action == '通过':
            cur.execute("UPDATE whjrscbmanage.iassist_flow_data SET approval_status=1 WHERE id=%s", (flow[0],))
            if flow_code == 'biz_mgr_change':
                # 换经理审批通过才变更归属（审批前业务仍归原负责人）
                cur.execute("SELECT new_handler, new_org_code, new_org_name FROM whjrscbmanage.bus_manager_change_history "
                            "WHERE business_id=%s ORDER BY id DESC LIMIT 1", (bid,))
                h = cur.fetchone()
                if h and h[0]:
                    cur.execute("SELECT creator FROM whjrscbmanage.bus_bond_business WHERE id=%s", (bid,))
                    old_creator = (cur.fetchone() or (None,))[0]
                    cur.execute("UPDATE whjrscbmanage.bus_bond_business SET creator=%s, org_code=%s, org_name=%s, update_time=NOW() WHERE id=%s",
                                (h[0], h[1], h[2], bid))
                    print(f'[OK] 客户经理变更通过：id={bid} bond_code={bcode} 负责人 {old_creator}→{h[0]}，已解锁')
                else:
                    print(f'[OK] 客户经理变更通过：id={bid} bond_code={bcode} 已解锁（无历史记录）')
            else:
                print(f'[OK] 变更通过：业务 id={bid} bond_code={bcode} 仍为生效中，已解锁')
        else:
            cur.execute("UPDATE whjrscbmanage.iassist_flow_data SET approval_status=2 WHERE id=%s", (flow[0],))
            print(f'[OK] 变更/换经理否决：业务 id={bid} bond_code={bcode} 保持原状，本次变更不生效')

    # ── biz_terminate：中止 ──
    elif flow_code == 'biz_terminate':
        if a.action == '通过':
            cur.execute("UPDATE whjrscbmanage.iassist_flow_data SET approval_status=1 WHERE id=%s", (flow[0],))
            cur.execute("UPDATE whjrscbmanage.bus_bond_business SET status=5, termination_reason='中止', update_time=NOW() WHERE id=%s", (bid,))
            print(f'[OK] 中止通过：业务 id={bid} bond_code={bcode} → 已中止(5)')
        else:
            cur.execute("UPDATE whjrscbmanage.iassist_flow_data SET approval_status=2 WHERE id=%s", (flow[0],))
            print(f'[OK] 中止否决：业务 id={bid} bond_code={bcode} 保持生效中')

    c.close()


if __name__ == '__main__':
    main()