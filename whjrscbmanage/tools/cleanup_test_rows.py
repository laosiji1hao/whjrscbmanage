# -*- coding: utf-8 -*-
"""清掉历次 e2e 中断残留的「自动化*」测试行（软删，走 is_deleted 与列表口径一致）。

标记列 = 各模块列表页上必显示的那个自由文本列（见 e2e_all.js 的 MARK_FIELD）：
  credit_renewal/prepayment → mt_fac_name、non_profit_conversion → cms_cust_cd、
  reserve_project → loan_type。另外早期脚本把标记写进过 remarks。
"""
import sys
from db import connect

sys.stdout = open(1, 'w', encoding='utf-8', errors='replace', closefd=False)

MARKER = {
    'credit_renewal': ['mt_fac_name', 'remarks'],
    'prepayment': ['mt_fac_name', 'remarks'],
    'non_profit_conversion': ['cms_cust_cd', 'remarks'],
    'reserve_project': ['loan_type', 'remarks'],
}

conn = connect(database='inclusive_mgmt', autocommit=True)
cur = conn.cursor()
for tbl, cols in MARKER.items():
    where = ' OR '.join('`%s` LIKE %%s' % c for c in cols)
    args = ['自动化%'] * len(cols)
    cur.execute('SELECT COUNT(*) FROM `%s` WHERE is_deleted = 0 AND (%s)' % (tbl, where), args)
    n = cur.fetchone()[0]
    if n:
        cur.execute('UPDATE `%s` SET is_deleted = 1 WHERE is_deleted = 0 AND (%s)' % (tbl, where), args)
    cur.execute('SELECT COUNT(*) FROM `%s` WHERE is_deleted = 0' % tbl)
    print('%-24s 清掉 %2d 行，剩余可见 %d 行' % (tbl, n, cur.fetchone()[0]))
conn.close()
