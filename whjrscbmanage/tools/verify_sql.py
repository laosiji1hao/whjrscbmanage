# -*- coding: utf-8 -*-
"""Smoke-test the data layer: row counts, every list/dict query, every SP."""
import io
import sys

from db import connect

sys.stdout = open(1, 'w', encoding='utf-8', errors='replace', closefd=False)
conn = connect(autocommit=True)
cur = conn.cursor()
fails = []


def q(label, sql, args=None, expect_rows=True):
    try:
        cur.execute(sql, args)
        rows = cur.fetchall()
        n = len(rows)
        flag = 'OK ' if (n > 0 or not expect_rows) else 'EMPTY'
        if flag == 'EMPTY':
            fails.append(label)
        print('  %-5s %-46s rows=%d  %s' % (flag, label, n, (rows[0] if rows else '')))
        return rows
    except Exception as e:
        fails.append(label)
        print('  ERR   %-46s %s' % (label, e))
        return []


print('== 行数 ==')
for t in ['credit_renewal', 'prepayment', 'reserve_project']:
    cur.execute("SELECT business_type, COUNT(*) FROM inclusive_mgmt.%s WHERE is_deleted=0 "
               "GROUP BY business_type" % t)
    print('  %-24s %s' % (t, cur.fetchall()))
# non_profit_conversion 无 business_type 列，两个部门共用
cur.execute("SELECT COUNT(*) FROM inclusive_mgmt.non_profit_conversion WHERE is_deleted=0")
print('  %-24s %s (无 business_type，两侧共用)' % ('non_profit_conversion', cur.fetchall()))
cur.execute("SELECT COUNT(*) FROM inclusive_mgmt.whoa_branch_info")
print('  whoa_branch_info         %s' % cur.fetchall())
cur.execute("SELECT COUNT(*) FROM common_db.whfr_branch_lay WHERE branch_no_lay2 IS NOT NULL")
print('  whfr_branch_lay.lay2 set %s' % cur.fetchall())
cur.execute("SELECT COUNT(*) FROM assign.acct_loan_info")
print('  assign.acct_loan_info    %s' % cur.fetchall())

print('\n== 字典数据集（原样 SQL） ==')
q('DICT_BRANCH', "SELECT branch_no, CONCAT(branch_nm,'(',branch_no,')') branch_nm FROM common_db.whfr_branch_lay")
q('DICT_BRANCH_LAY2', """SELECT a.branch_no_lay2, CONCAT(b.branch_nm,'(',a.branch_no_lay2,')') branch_nm, a.branch_list
   FROM (SELECT branch_no_lay2, GROUP_CONCAT(branch_no SEPARATOR "','") AS branch_list
         FROM common_db.whfr_branch_lay GROUP BY branch_no_lay2) a
   LEFT JOIN common_db.whfr_branch_lay b ON a.branch_no_lay2 = b.branch_no""")
q('DICT_OA', "SELECT CONCAT(employee_nm,'(',employee_oa,')') employee_nm, employee_oa FROM common_db.employee_info")
q('DICT_CUSTOMER(普惠)', """SELECT a.customer_no, a.customer_name FROM assign.customer_info a
   LEFT JOIN assign.acct_loan_info b ON a.customer_no=b.customer_no WHERE b.acct_no_br='03'""")
q('DICT_CUSTOMER(零售concat)', """SELECT a.customer_no, CONCAT(a.customer_name,'-',a.customer_no) customer_name
   FROM assign.fact_customer_info a LEFT JOIN assign.fact_acct_loan_info b ON a.customer_no=b.customer_no
   WHERE b.acct_no_br='03'""")
q('DICT_CUSTOMER_NO(零售)', """SELECT a.customer_no FROM assign.fact_customer_info a
   LEFT JOIN assign.fact_acct_loan_info b ON a.customer_no=b.customer_no AND b.customer_type='01'
   WHERE a.customer_name=%s""", ('武汉长江光电有限公司',))
q('DICT_ACCT(普惠)', """SELECT acct_no FROM assign.fact_acct_loan_info a
   LEFT JOIN assign.fact_customer_info b ON a.customer_no=b.customer_no
   WHERE a.acct_no_br='03' AND a.loan_bal_r>0 AND b.customer_no=%s""", ('C0001',))
q('DICT_ACCT(零售)', """SELECT acct_no FROM assign.fact_acct_loan_info a
   LEFT JOIN assign.fact_customer_info b ON a.customer_no=b.customer_no
   WHERE a.acct_no_br='01' AND a.loan_bal_r>=0 AND b.customer_no=%s""", ('C0001',))
q('DICT_CUSTOMER 零售按用户', """SELECT a.customer_no, CONCAT(a.customer_name,'-',a.customer_no) customer_name
   FROM assign.fact_customer_info a LEFT JOIN assign.fact_acct_loan_info b ON a.customer_no=b.customer_no
   LEFT JOIN assign.whfr_user u ON b.branch_no=u.branch_no
   WHERE b.acct_no_br='01' AND u.user_id=%s""", ('cm001',))

print('\n== 列表查询（管理员，不带 branch 过滤） ==')
for side, bt in [('普惠', '1'), ('零售信贷', '0')]:
    for mod, extra in [('credit_renewal', ' AND dt_maturity>=\'2026-01-01\''),
                       ('prepayment', ''), ('reserve_project', '')]:
        q('%s.%s' % (side, mod),
          "SELECT * FROM inclusive_mgmt.%s WHERE is_deleted=0 AND business_type=%%s%s ORDER BY id DESC" % (mod, extra),
          (bt,))
    q('%s.count' % side,
      "SELECT COUNT(*) totalcnt, CEILING(COUNT(*)/10) totalpage FROM inclusive_mgmt.%s WHERE is_deleted=0 AND business_type=%%s" % mod, (bt,))
q('普惠.non_profit_conversion', "SELECT * FROM inclusive_mgmt.non_profit_conversion WHERE is_deleted=0 ORDER BY id DESC")
q('普惠.dept_name join', """SELECT c.id, c.branch_no, w.dept_name FROM inclusive_mgmt.credit_renewal c
   LEFT JOIN inclusive_mgmt.whoa_branch_info w ON c.branch_no=w.branch_no
   WHERE c.is_deleted=0 AND c.business_type='1' ORDER BY c.id DESC""")
q('零售.credit_renewal detail join', """SELECT c.id, c.cust_name, a.customer_name FROM inclusive_mgmt.credit_renewal c
   LEFT JOIN assign.customer_info a ON c.cust_name=a.customer_no WHERE c.id=101""")

print('\n== 存储过程 ==')
q('sp_credit_renewal_insert', "CALL inclusive_mgmt.sp_credit_renewal_insert(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
  ('C0009', '流贷', '2026-01-01', 'ACCX', '2027-01-01', '100', 'true', 'false', 'false', '', '',
   'ln001', '0001', '待申报', '2026-09-21 10:00:00', '冒烟测试', '1', 'tester'))
cur.execute("SELECT LAST_INSERT_ID()")
new_id = cur.fetchone()[0]
print('        -> new id =', new_id)
q('sp_credit_renewal_update', "CALL inclusive_mgmt.sp_credit_renewal_update(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
  (new_id, 'C0009改', '流贷', '2026-01-01', 'ACCX', '2027-01-01', '200', 'true', 'true', 'true',
   '150', '2026-09-30', 'ln001', '0002', '审批中', '2026-09-21 11:00:00', '冒烟测试改', '1', 'tester'))
q('sp_credit_renewal_status', "CALL inclusive_mgmt.sp_credit_renewal_status(%s,%s,%s,%s,%s)",
  (new_id, '已批准', '2026-09-21 12:00:00', '1', 'tester'))
q('  ^ 越权守卫(business_type=0)', "CALL inclusive_mgmt.sp_credit_renewal_status(%s,%s,%s,%s,%s)",
  (new_id, '已办理', '2026-09-21 12:30:00', '0', 'tester'))
q('sp_credit_renewal_delete', "CALL inclusive_mgmt.sp_credit_renewal_delete(%s,%s,%s)", (new_id, '1', 'tester'))

q('sp_prepayment_insert', "CALL inclusive_mgmt.sp_prepayment_insert(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
  ('C0009', '流贷', '2026-01-01', 'ACCX', '2027-01-01', '100', 'false', 'false', 'ln001', '0001',
   '待提交申请', '2026-09-21 10:00:00', '2026-12-01', '2026-12-01', '50', '0', '冒烟', '1', 'tester'))
cur.execute("SELECT LAST_INSERT_ID()")
pp_id = cur.fetchone()[0]
q('sp_prepayment_status', "CALL inclusive_mgmt.sp_prepayment_status(%s,%s,%s,%s,%s)",
  (pp_id, '已批准', '2026-09-21 12:00:00', '1', 'tester'))
q('sp_prepayment_delete', "CALL inclusive_mgmt.sp_prepayment_delete(%s,%s,%s)", (pp_id, '1', 'tester'))

q('sp_reserve_project_insert', "CALL inclusive_mgmt.sp_reserve_project_insert(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
  ('C0009', 'true', 'false', '普惠', '500', '流贷', '2026-10-01', '2026-11-01', '科技', 'ln001',
   '13800000002', '0001', '冒烟', '待申报', '2026-09-21 10:00:00', '1', 'tester'))
cur.execute("SELECT LAST_INSERT_ID()")
rp_id = cur.fetchone()[0]
q('sp_reserve_project_insert(零售无电话)', "CALL inclusive_mgmt.sp_reserve_project_insert(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
  ('C0009', 'true', 'false', '普惠', '500', '个人经营性', '2026-10-01', '2026-11-01', '', 'ln001',
   '', '0001', '冒烟', '待申报', '2026-09-21 10:00:00', '0', 'tester'))
cur.execute("SELECT LAST_INSERT_ID()")
rp0_id = cur.fetchone()[0]
q('sp_reserve_project_delete(普惠)', "CALL inclusive_mgmt.sp_reserve_project_delete(%s,%s,%s)", (rp_id, '1', 'tester'))
q('sp_reserve_project_delete(零售)', "CALL inclusive_mgmt.sp_reserve_project_delete(%s,%s,%s)", (rp0_id, '0', 'tester'))

q('sp_non_profit_conversion_insert', "CALL inclusive_mgmt.sp_non_profit_conversion_insert(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
  ('普惠', 'C0009', 'C0009', 'ACCX', '100', '0', '100', 'ln001', '0001', '冒烟', '待申报', '2026-09-21 10:00:00', 'tester'))
cur.execute("SELECT LAST_INSERT_ID()")
np_id = cur.fetchone()[0]
q('sp_non_profit_conversion_status', "CALL inclusive_mgmt.sp_non_profit_conversion_status(%s,%s,%s,%s)",
  (np_id, '已批准', '2026-09-21 12:00:00', 'tester'))
q('sp_non_profit_conversion_delete', "CALL inclusive_mgmt.sp_non_profit_conversion_delete(%s,%s)", (np_id, 'tester'))

q('sp_mgmt_forbidden_set', "CALL inclusive_mgmt.sp_mgmt_forbidden_set('forbidden_flag_reserve','1')")
q('sp_mgmt_forbidden_set 回滚', "CALL inclusive_mgmt.sp_mgmt_forbidden_set('forbidden_flag_reserve','0')")

print('\n== 残留检查（冒烟数据应已软删） ==')
cur.execute("SELECT COUNT(*) FROM inclusive_mgmt.credit_renewal WHERE cust_name LIKE 'C0009%' AND is_deleted=0")
print('  credit_renewal 未删残留 =', cur.fetchone()[0])
cur.execute("SELECT COUNT(*) FROM inclusive_mgmt.prepayment WHERE cust_name LIKE 'C0009%' AND is_deleted=0")
print('  prepayment 未删残留     =', cur.fetchone()[0])
cur.execute("SELECT COUNT(*) FROM inclusive_mgmt.reserve_project WHERE customer_name LIKE 'C0009%' AND is_deleted=0")
print('  reserve_project 未删残留=', cur.fetchone()[0])
cur.execute("SELECT COUNT(*) FROM inclusive_mgmt.non_profit_conversion WHERE cms_cust_cd LIKE 'C0009%' AND is_deleted=0")
print('  non_profit 未删残留     =', cur.fetchone()[0])

conn.close()
print('\nFAILURES =', len(fails))
for f in fails:
    print('   -', f)
sys.exit(1 if fails else 0)
