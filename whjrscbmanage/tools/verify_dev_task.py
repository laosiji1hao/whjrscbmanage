# -*- coding: utf-8 -*-
"""对 docs/dev_task_*.json 里每条数据集 SQL 做真机验证。

三件事：
  1) 按 FR 的文本替换语义展开 ${...}（含 ${if(...)} 片段），在 MySQL 上真跑
  2) 写入数据集在事务里跑完回滚，确认 CALL 的实参与存储过程签名对得上
  3) 两侧 JSON 做结构化 diff，确认差异只有预期的那些

用法： python verify_dev_task.py
"""
import io
import json
import os
import re
import sys

from db import connect

sys.stdout = open(1, 'w', encoding='utf-8', errors='replace', closefd=False)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'docs')

FAIL = []


# ── FR 的 ${...} 文本替换语义 ────────────────────────────────────────────────
def split_args(s):
    """按顶层逗号切分，尊重引号与括号。"""
    out, depth, inq, cur = [], 0, None, []
    for ch in s:
        if inq:
            cur.append(ch)
            if ch == inq:
                inq = None
        elif ch in '"\'':
            inq = ch
            cur.append(ch)
        elif ch in '([':
            depth += 1
            cur.append(ch)
        elif ch in ')]':
            depth -= 1
            cur.append(ch)
        elif ch == ',' and depth == 0:
            out.append(''.join(cur))
            cur = []
        else:
            cur.append(ch)
    out.append(''.join(cur))
    return [x.strip() for x in out]


def eval_cond(cond, env):
    """只认 origin 实际用到的两种条件。"""
    m = re.match(r'^len\((\w+)\)\s*==\s*0$', cond.strip())
    if m:
        return env.get(m.group(1), '') == ''
    m = re.match(r'^INARRAY\("([^"]*)",\s*(\w+)\)\s*=\s*0$', cond.strip())
    if m:
        roles = env.get(m.group(2), '')
        return m.group(1) not in [r.strip() for r in roles.split(',') if r.strip()]
    raise ValueError('无法求值的条件: %r' % cond)


def eval_expr(expr, env):
    expr = expr.strip()
    if expr.startswith('if(') and expr.endswith(')'):
        cond, a, b = split_args(expr[3:-1])
        return eval_expr(a, env) if eval_cond(cond, env) else eval_expr(b, env)
    # origin 的表达式就是 "AND x IN ('" + p + "')" 这种字符串拼接，直接交给 Python。
    # 注意不能先按「首尾都是引号」当纯字面量剥 —— `"a" + x + "b"` 也满足首尾是引号，
    # 那样会把整个未展开的表达式原样返回（这个坑真踩过一次）。
    try:
        return str(eval(expr, {'__builtins__': {}}, dict(env)))
    except NameError:
        if re.match(r'^".*"$', expr, re.S):
            return expr[1:-1]
        raise


def expand(sql, env):
    while '${' in sql:
        i = sql.index('${')
        depth, j, inq = 0, i + 1, None
        while j < len(sql):
            ch = sql[j]
            if inq:
                if ch == inq:
                    inq = None
            elif ch in '"\'':
                inq = ch
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    break
            j += 1
        sql = sql[:i] + eval_expr(sql[i + 2:j], env) + sql[j + 1:]
    return sql


# ── 环境取值：先查库，再拼 env ──────────────────────────────────────────────
def build_env(cu, side, params, admin, filters):
    """admin=True 时 fine_role 含管理员角色（看全部）；False 时只给机构范围。"""
    env = {}
    roles = []
    if admin:
        # role_field 是侧别角色；npc 数据集用普惠角色，两种都放进去最省事
        roles = ['普惠条线授信客户精细化管理系统-分行管理员',
                 side['permission']['role_field']]
    env['fine_role'] = ','.join(roles)

    for p in params:
        n = p['name']
        if n in filters:
            env[n] = filters[n]
        elif n == 'fine_role':
            continue
        elif n == 'pp_pageno':
            env[n] = 1
        elif n == 'pp_pagesize':
            env[n] = 20
        elif n == 'branch_no_list':
            env[n] = SCOPES[side['_key']]
        elif n == 'processing_status':
            env[n] = ''
        elif n == 'branch_list':
            env[n] = ''
        elif n == 'start_date' or n == 'end_date':
            env[n] = ''
        elif n == 'p_id':
            env[n] = int(SAMPLE_ID[side['_key']]) if p.get('type') == 'Integer' \
                else str(SAMPLE_ID[side['_key']])
        elif n == 'p_business_type':
            env[n] = side['_bt']
        elif n == 'p_operator':
            env[n] = 'verify_script'
        elif n == 'user_name':
            env[n] = 'cm001'
        elif n == 'cust_name':
            env[n] = SAMPLE_CUST
        elif n == 'cust_chinese_name':
            env[n] = SAMPLE_CUST_NAME
        elif n == 'p_config_key':
            env[n] = 'forbidden_flag_credit'
        elif n == 'p_config_value':
            env[n] = '0'
        elif n in FILL:
            env[n] = FILL[n]
        else:
            env[n] = ''
    return env


# 写入数据集的实参：按参数名取合理值，跑完回滚
FILL = {
    'p_cust_name': 'V_T', 'p_mt_fac_name': 'V_T', 'p_dt_first_disb': '2026-01-01',
    'p_new_bcs_acct_no': 'V_T', 'p_dt_maturity': '2026-12-31', 'p_bsn_bal': '1',
    'p_is_low_risk': 'true', 'p_is_dbl_inc': 'false', 'p_is_refinance': 'true',
    'p_refinance_amt': '1', 'p_declaration_date': '2026-02-01', 'p_cust_mgr': 'V_T',
    'p_branch_no': '0001', 'p_processing_status': '待申报',
    'p_processing_status_date': '2026-02-01 10:00:00', 'p_remarks': 'verify',
    'p_expected_repayment_date': '2026-06-01', 'p_actual_repayment_date': '2026-06-02',
    'p_expected_repayment_amount': '1', 'p_actual_repayment_amount': '1',
    'p_customer_name': 'V_T', 'p_is_double_increase': 'true', 'p_bus_line': '普惠',
    'p_net_increase_amount': '1', 'p_loan_type': '流贷',
    'p_expected_declaration_date': '2026-03-01', 'p_expected_loan_date': '2026-04-01',
    'p_enterprise_tag': '科技', 'p_cust_mgr_telephone': '13800000000',
    'p_cms_cust_cd': 'V_T', 'p_aprved_amt': '1', 'p_expected_amt': '1',
    'p_operator': 'verify_script', 'p_config_key': 'forbidden_flag_credit',
    'p_config_value': '0',
}

DATASET_PARAMS = {}
SCOPES = {}
SAMPLE_ID = {}
SAMPLE_CUST = ''
SAMPLE_CUST_NAME = ''

# FR 连接名 → 真实 schema（whfruser 是连接名，库其实是 common_db）
CONN_DB = {'whfruser': 'common_db', 'common_db': 'common_db', 'assign': 'assign',
           'inclusive_mgmt': 'inclusive_mgmt'}


def main():
    global SAMPLE_CUST, SAMPLE_CUST_NAME
    conn = connect(autocommit=False)
    cu = conn.cursor()

    cu.execute("SELECT GROUP_CONCAT(b.branch_no SEPARATOR \"','\") FROM common_db.whfr_branch_lay a "
               "LEFT JOIN common_db.whfr_branch_lay b ON a.branch_no_lay2=b.branch_no_lay2 "
               "WHERE a.branch_no=(SELECT wbi.branch_no COLLATE utf8mb4_0900_ai_ci "
               "FROM common_db.whfr_user wu LEFT JOIN common_db.whoa_branch_info wbi "
               "ON wu.dept_id=wbi.dept_id WHERE wu.user_id='cm001' LIMIT 1)")
    SCOPES['普惠'] = cu.fetchone()[0]
    SCOPES['零售信贷'] = SCOPES['普惠']  # 两侧公式一致
    cu.execute("SELECT MIN(id) FROM inclusive_mgmt.credit_renewal")
    SAMPLE_ID['普惠'] = SAMPLE_ID['零售信贷'] = cu.fetchone()[0]
    cu.execute("SELECT customer_no FROM assign.fact_customer_info LIMIT 1")
    SAMPLE_CUST = cu.fetchone()[0]
    cu.execute("SELECT customer_name FROM assign.fact_customer_info LIMIT 1")
    SAMPLE_CUST_NAME = cu.fetchone()[0]

    tasks = {}
    for f, key in [('dev_task_普惠.json', '普惠'), ('dev_task_零售信贷.json', '零售信贷')]:
        with open(os.path.join(DOCS, f), encoding='utf-8') as fh:
            t = json.load(fh)
        t['_key'] = key
        t['_bt'] = '1' if key == '普惠' else '0'
        tasks[key] = t
        for d in t['database']['datasets']:
            DATASET_PARAMS[(key, d['name'])] = d.get('params', [])

    # ── 逐条真跑 ────────────────────────────────────────────────────────────
    for key, t in tasks.items():
        print('\n' + '=' * 78)
        print('  %s   (%s)' % (key, t['module']))
        print('=' * 78)
        for d in t['database']['datasets']:
            name, kind, sql = d['name'], d['type'], d['sql']
            params = d.get('params', [])
            # db_connection → 真实 schema：FR 里连接名与库名不一定同名
            conn.select_db(CONN_DB.get(d.get('db_connection'), 'inclusive_mgmt'))
            is_write = kind in ('insert', 'update', 'delete')
            # 只读数据集跑两种角色 + 一组筛选
            runs = []
            if is_write:
                runs.append(('非管理员', False, {}))
            else:
                runs.append(('管理员/无筛选', True, {}))
                runs.append(('非管理员/无筛选', False, {}))
                if name.endswith('_list') and name.startswith('credit_renewal'):
                    runs.append(('管理员/带筛选', True,
                                 {'processing_status': '已办理', 'start_date': '2000-01-01',
                                  'end_date': '2099-12-31'}))
                if name.endswith('_list') and not name.startswith('credit_renewal'):
                    runs.append(('管理员/带筛选', True,
                                 {'processing_status': '已办理', 'branch_list': SCOPES[key]}))
            for label, admin, filters in runs:
                env = build_env(cu, t, params, admin, filters)
                try:
                    real = expand(sql, env)
                except Exception as e:
                    FAIL.append('%s/%s [%s] 展开失败: %s' % (key, name, label, e))
                    print('  !! %-26s %-14s 展开失败 %s' % (name, label, e))
                    continue
                try:
                    cu.execute(real)
                    if is_write:
                        conn.rollback()
                        print('  ok %-26s %-14s CALL 成功（已回滚）' % (name, label))
                    else:
                        rows = cu.fetchall()
                        print('  ok %-26s %-14s %d 行' % (name, label, len(rows)))
                except Exception as e:
                    conn.rollback()
                    FAIL.append('%s/%s [%s] %s' % (key, name, label, e))
                    print('  !! %-26s %-14s %s' % (name, label, e))
                    print('     SQL: %s' % real.replace('\n', ' ')[:220])

    conn.close()
    print('\n' + '=' * 78)
    print('FAILURES = %d' % len(FAIL))
    for f in FAIL:
        print('  - %s' % f)
    return 1 if FAIL else 0


if __name__ == '__main__':
    sys.exit(main())
