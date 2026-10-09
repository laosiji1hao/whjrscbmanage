# -*- coding: utf-8 -*-
"""Generate docs/dev_task_普惠.json and docs/dev_task_零售信贷.json.

Both files come from the SAME builder, so the only differences between them are
the ones declared in SIDES / PER-MODULE below — that keeps the two-sided diff
auditable instead of two hand-maintained copies drifting apart.

Every SQL here was copied from origin/*.cpt and then adjusted in exactly the ways
listed in ADJUSTMENTS at the bottom of this file.

Run:  python gen_dev_task.py
"""
import io
import json
import os
import sys

sys.stdout = open(1, 'w', encoding='utf-8', errors='replace', closefd=False)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'docs')

# ── 列清单（显式列出，不用 SELECT *）────────────────────────────────────────
# origin 的列表 SQL 是 `SELECT * , w.dept_name`：带了 JOIN 之后 whoa_branch_info
# 的 id / branch_no 会与业务表同名列一起返回。/api/data 返回的是 JSON 对象，重名键
# 后者覆盖前者 —— 前端拿到的 row.id 会静默变成机构表主键。故一律显式列列。
COLS = {
    'credit_renewal': [
        'c.id', 'c.business_type', 'c.cust_name', 'c.mt_fac_name', 'c.dt_first_disb',
        'c.new_bcs_acct_no', 'c.dt_maturity', 'c.bsn_bal', 'c.is_low_risk', 'c.is_dbl_inc',
        'c.is_refinance', 'c.refinance_amt', 'c.declaration_date', 'c.cust_mgr',
        'c.branch_no', 'c.processing_status', 'c.processing_status_date', 'c.remarks',
    ],
    'prepayment': [
        'p.id', 'p.business_type', 'p.cust_name', 'p.mt_fac_name', 'p.dt_first_disb',
        'p.new_bcs_acct_no', 'p.dt_maturity', 'p.bsn_bal', 'p.is_low_risk', 'p.is_dbl_inc',
        'p.cust_mgr', 'p.branch_no', 'p.processing_status', 'p.processing_status_date',
        'p.expected_repayment_date', 'p.actual_repayment_date',
        'p.expected_repayment_amount', 'p.actual_repayment_amount', 'p.remarks',
    ],
    'reserve_project': [
        'r.id', 'r.business_type', 'r.customer_name', 'r.is_double_increase', 'r.is_low_risk',
        'r.bus_line', 'r.net_increase_amount', 'r.loan_type', 'r.expected_declaration_date',
        'r.expected_loan_date', 'r.enterprise_tag', 'r.cust_mgr', 'r.cust_mgr_telephone',
        'r.branch_no', 'r.remarks', 'r.processing_status', 'r.processing_status_date',
    ],
    'non_profit_conversion': [
        'id', 'bus_line', 'cms_cust_cd', 'cust_name', 'new_bcs_acct_no', 'aprved_amt',
        'bsn_bal', 'expected_amt', 'cust_mgr', 'branch_no', 'remarks',
        'processing_status', 'processing_status_date',
    ],
}

# ── 详情查询的列名改写（读取侧，与写入侧的 PARAM_ALIAS 对称）─────────────────
# (侧, 模块) → {库列名: 表单字段名}，只在 *_get 里生效。见 _get_cols 的说明。
GET_ALIAS = {
    ('普惠', 'reserve_project'): {'cust_mgr_telephone': 'cust_mgr_phone'},
}

# 详情查询里要做 'true'/'false' 归一化的「是否」列（tinyint(1) → 接口口径的字符串）。
# 与写入侧 SP 的 IF(p_x = 'true', 1, 0) 同一套口径。见 _get_cols 的说明。
YN_COLS = {'is_low_risk', 'is_dbl_inc', 'is_refinance', 'is_double_increase'}

ALIAS = {'credit_renewal': 'c', 'prepayment': 'p', 'reserve_project': 'r',
         'non_profit_conversion': ''}
# origin 的 ORDER BY：credit_renewal / reserve_project 有写，prepayment 没写；
# 这里给 prepayment 补一个 id DESC 保证翻页稳定（见 ADJUSTMENTS 第 3 条）。
ORDER_BY = {'credit_renewal': 'id DESC', 'prepayment': 'id DESC',
            'reserve_project': 'branch_no, id DESC', 'non_profit_conversion': 'id DESC'}
# 只有 credit_renewal 列表带到期日区间筛选（origin 的 start_date/end_date）
DATE_FILTER_MODULES = ['credit_renewal']

MODULES = ['credit_renewal', 'non_profit_conversion', 'prepayment', 'reserve_project']

# 普惠的列表 SQL 取了机构名（`SELECT * , w.dept_name` + LEFT JOIN whoa_branch_info）；
# 零售信贷的列表 SQL 是裸 `SELECT *`，没有这个 JOIN，也就没有 dept_name 列。
# 这是 origin 两侧真实存在的差异，按「保留差异」处理，不擅自补齐。
DEPT_JOIN_SIDES = ['普惠']


def admin_role(mod, side):
    """分行管理员角色名。

    non_profit_conversion 两侧共用一份页面（零售信贷目录里那 5 个 npc 文件与普惠
    逐字节相同，弹窗路径也都指向 Inclusive_finance_dept），所以它的角色判定用的是
    普惠那个角色名 —— 两侧都是。
    """
    if mod == 'non_profit_conversion':
        return '普惠条线授信客户精细化管理系统-分行管理员'
    return side['admin_role']


def where_clause(mod, side):
    """列表/计数的 WHERE（不含 WHERE 关键字）。逐条复刻 origin 的 ${if(...)} 片段。"""
    a = ALIAS[mod]
    pre = (a + '.') if a else ''
    parts = ['%sis_deleted = 0' % pre]
    if mod != 'non_profit_conversion':
        parts.append("and %sbusiness_type = '%s'" % (pre, side['business_type']))
    parts.append('${if(len(processing_status)==0,"", "AND %sprocessing_status IN (\'" '
                 '+ processing_status + "\')")}' % pre)
    parts.append("${if(len(branch_list)==0,\"\", \"AND %sbranch_no IN ('\" "
                 "+ branch_list + \"')\")}" % pre)
    if mod in DATE_FILTER_MODULES:
        parts.append("${if(len(start_date)==0,\"\", \"AND %sdt_maturity >= '\" "
                     "+ start_date + \"'\")}" % pre)
        parts.append("${if(len(end_date)==0,\"\", \"AND %sdt_maturity <= '\" "
                     "+ end_date + \"'\")}" % pre)
    # 分行管理员看全部；否则收敛到 sys_branch_no_list 解析出的机构范围。
    # fine_role 必须裹一层 SPLIT：INARRAY 的第二个参数要的是**数组**，直接喂
    # 数据集 String 参数会得到 #VALUE?，`= 0` 因此恒假、机构过滤永不生效。
    # SPLIT 把它还原成数组后语义与 origin 一致（实测命中=1 / 未命中=0 / 空串=0，
    # 失败方向是收紧而非放开）。见 README「身份参数必须显式传」。
    parts.append('${if(INARRAY("%s", SPLIT(fine_role, ",")) = 0, "AND %sbranch_no IN (\'" '
                 '+ branch_no_list + "\')", "")}' % (admin_role(mod, side), pre))
    return ' '.join(parts)


def from_clause(mod, side):
    a = ALIAS[mod]
    if a:
        frm = '%s %s' % (mod, a)
        if side['name'] in DEPT_JOIN_SIDES:
            frm += ' LEFT JOIN whoa_branch_info w ON %s.branch_no = w.branch_no' % a
        return frm
    return mod


def list_sql(mod, side):
    cols = list(COLS[mod])
    if side['name'] in DEPT_JOIN_SIDES and mod != 'non_profit_conversion':
        cols.append('w.dept_name')
    a = ALIAS[mod]
    return ('SELECT %s\nFROM %s\nWHERE %s\nORDER BY %s\n'
            'LIMIT ${(pp_pageno - 1) * pp_pagesize}, ${pp_pagesize}'
            % (', '.join(cols), from_clause(mod, side), where_clause(mod, side),
               ('%s.' % a if a else '') + ORDER_BY[mod]))


def count_sql(mod, side):
    """计数不 JOIN 机构表 —— origin 的 pagetool 也是裸表。
    JOIN 虽因 whoa_branch_info.branch_no 唯一而不会放大计数，但白搭一次连接，
    且一旦机构表出现重复行就会静默多算。"""
    a = ALIAS[mod]
    frm = ('%s %s' % (mod, a)) if a else mod
    return ('SELECT COUNT(*) AS totalcnt, CEILING(COUNT(*) / ${pp_pagesize}) AS totalpage\n'
            'FROM %s\nWHERE %s' % (frm, where_clause(mod, side)))


def _get_cols(mod, side):
    """详情查询的列清单 = COLS，外加两处「读取侧」改写 —— 都是把返回值落到控件的取值空间里。

    详情回填是按**列名 = 表单字段名**逐字段取的（gen_pages_run.load_map_js 写
    `v[字段名] = d[字段名]`），所以详情行必须同时满足两件事：

    1. **列名**要等于控件名。储备项目的「责任人联系电话」在 origin 里控件名是
       cust_mgr_phone，而库列名 / SP 入参名是 cust_mgr_telephone —— 写入侧靠
       gen_pages.PARAM_ALIAS 把控件名映射成入参名，读取侧必须对称地改回来。
       不改的后果不是「少显示一个格子」：该字段必填，详情弹窗里它永远是空的，
       用户点「修改」**毫无反应**（validateFields 被拒后 .catch 静默吞掉），编辑链路断掉。

    2. **取值**要落在选项的取值空间里。「是否」类字段库列是 tinyint(1)，JDBC 驱动把它
       返成 **JS 布尔**（tinyInt1isBit 默认开），而接口口径是字符串 'true'/'false' ——
       写入侧 SP 里就是 `IF(p_x = 'true', 1, 0)`。布尔塞进 Select，选项值全是字符串，
       匹配不上：值其实在，但选中项渲染成**空白**，用户看到几个空的必填项。

    只在详情查询里改，不动 COLS —— 列表查询的列名与取值都另有约定（列名是
    cust_mgr_telephone；是否类走前端 yn() 渲染，0/1/true/false 都认）。
    """
    amap = GET_ALIAS.get((side['name'], mod)) or {}
    out = []
    for c in COLS[mod]:
        bare = c.rsplit('.', 1)[-1]
        name = amap.get(bare, bare)
        if bare in YN_COLS:
            # 用 CASE 而不是 IF(c = 1, ...)：NULL 必须原样留成 NULL，
            # 不能悄悄变成「否」——否则一个没填过的行会被回显成明确的选择。
            out.append("CASE WHEN %s = 1 THEN 'true' WHEN %s = 0 THEN 'false' END AS %s"
                       % (c, c, name))
        elif name != bare:
            out.append('%s AS %s' % (c, name))
        else:
            out.append(c)
    return out


def get_sql(mod, side):
    """详情/编辑回显。

    零售信贷的 credit_renewal / prepayment 原页面 JOIN 了 assign.customer_info 取
    客户中文名（表单里「客户名称」是独立文本框，回显要用）。JOIN 只取
    cu.customer_name —— customer_info 也有 id/customer_no，带进来就会覆盖业务表的
    同名列（同上文的重复键问题）。
    """
    if side['name'] == '零售信贷' and mod in ('credit_renewal', 'prepayment'):
        a = ALIAS[mod]
        return ('SELECT %s, cu.customer_name\nFROM %s %s\n'
                'LEFT JOIN assign.customer_info cu ON %s.cust_name = cu.customer_no\n'
                'WHERE %s.id = \'${p_id}\''
                % (', '.join(_get_cols(mod, side)), mod, a, a, a))
    if ALIAS[mod]:
        a = ALIAS[mod]
        return 'SELECT %s\nFROM %s %s\nWHERE %s.id = \'${p_id}\'' % (
            ', '.join(_get_cols(mod, side)), mod, a, a)
    return "SELECT %s\nFROM %s\nWHERE id = '${p_id}'" % (', '.join(_get_cols(mod, side)), mod)


# ── 参数定义 ────────────────────────────────────────────────────────────────
def P(name, ptype='String', default=None):
    d = {'name': name, 'type': ptype}
    if default is not None:
        d['default'] = default
    return d


# ⚠ 身份类参数（p_operator / fine_role / user_name）一律是**普通 String，由调用方提供**。
#
# 它们原先写成 type='formula' + default='=$fine_username'，指望帆软按会话求值。
# 实测**不成立**：/api/data 取数时既不采用公式默认值，也不采用普通串默认值 ——
# 数据集参数只有请求里显式带进来的才有值（见 README「身份参数必须显式传」）。
# 后果曾是：写入的 created_by/updated_by 全空、真实分行管理员被错误地按机构过滤、
# 零售的客户下拉是空的。所以这三个参数的类型必须是 String，值由页面注入。
IDENTITY_PARAMS = ('p_operator', 'fine_role', 'user_name')

LIST_PARAMS = ([P('processing_status'), P('branch_list'), P('start_date'), P('end_date'),
                P('pp_pageno', 'Integer', '1'), P('pp_pagesize', 'Integer', '20'),
                P('branch_no_list'), P('fine_role')])
COUNT_PARAMS = ([P('processing_status'), P('branch_list'), P('start_date'), P('end_date'),
                 P('pp_pagesize', 'Integer', '20'), P('branch_no_list'),
                 P('fine_role')])
GET_PARAMS = [P('p_id', 'Integer', '0')]
OPERATOR = P('p_operator')

# 写入数据集：入参顺序 = sql/3-存储过程.sql 的签名顺序（已逐个核对）
# 每项 = (入参名列表, 是否带 business_type)
WRITE_ARGS = {
    'credit_renewal': {
        'insert': (['p_cust_name', 'p_mt_fac_name', 'p_dt_first_disb', 'p_new_bcs_acct_no',
                    'p_dt_maturity', 'p_bsn_bal', 'p_is_low_risk', 'p_is_dbl_inc',
                    'p_is_refinance', 'p_refinance_amt', 'p_declaration_date', 'p_cust_mgr',
                    'p_branch_no', 'p_processing_status', 'p_processing_status_date',
                    'p_remarks'], True),
        'update': (['p_id', 'p_cust_name', 'p_mt_fac_name', 'p_dt_first_disb',
                    'p_new_bcs_acct_no', 'p_dt_maturity', 'p_bsn_bal', 'p_is_low_risk',
                    'p_is_dbl_inc', 'p_is_refinance', 'p_refinance_amt', 'p_declaration_date',
                    'p_cust_mgr', 'p_branch_no', 'p_processing_status',
                    'p_processing_status_date', 'p_remarks'], True),
        'status': (['p_id', 'p_processing_status', 'p_processing_status_date'], True),
        'delete': (['p_id'], True),
    },
    'prepayment': {
        'insert': (['p_cust_name', 'p_mt_fac_name', 'p_dt_first_disb', 'p_new_bcs_acct_no',
                    'p_dt_maturity', 'p_bsn_bal', 'p_is_low_risk', 'p_is_dbl_inc',
                    'p_cust_mgr', 'p_branch_no', 'p_processing_status',
                    'p_processing_status_date', 'p_expected_repayment_date',
                    'p_actual_repayment_date', 'p_expected_repayment_amount',
                    'p_actual_repayment_amount', 'p_remarks'], True),
        'update': (['p_id', 'p_cust_name', 'p_mt_fac_name', 'p_dt_first_disb',
                    'p_new_bcs_acct_no', 'p_dt_maturity', 'p_bsn_bal', 'p_is_low_risk',
                    'p_is_dbl_inc', 'p_cust_mgr', 'p_branch_no', 'p_processing_status',
                    'p_processing_status_date', 'p_expected_repayment_date',
                    'p_actual_repayment_date', 'p_expected_repayment_amount',
                    'p_actual_repayment_amount', 'p_remarks'], True),
        'status': (['p_id', 'p_processing_status', 'p_processing_status_date'], True),
        'delete': (['p_id'], True),
    },
    'reserve_project': {
        # 注意 p_is_low_risk 是第 3 个入参（不是第 2 个）
        'insert': (['p_customer_name', 'p_is_double_increase', 'p_is_low_risk', 'p_bus_line',
                    'p_net_increase_amount', 'p_loan_type', 'p_expected_declaration_date',
                    'p_expected_loan_date', 'p_enterprise_tag', 'p_cust_mgr',
                    'p_cust_mgr_telephone', 'p_branch_no', 'p_remarks',
                    'p_processing_status', 'p_processing_status_date'], True),
        'update': (['p_id', 'p_customer_name', 'p_is_double_increase', 'p_is_low_risk',
                    'p_bus_line', 'p_net_increase_amount', 'p_loan_type',
                    'p_expected_declaration_date', 'p_expected_loan_date', 'p_enterprise_tag',
                    'p_cust_mgr', 'p_cust_mgr_telephone', 'p_branch_no', 'p_remarks',
                    'p_processing_status', 'p_processing_status_date'], True),
        'status': (['p_id', 'p_processing_status', 'p_processing_status_date'], True),
        'delete': (['p_id'], True),
    },
    # non_profit_conversion 表无 business_type 列，SP 也没有该入参
    'non_profit_conversion': {
        'insert': (['p_bus_line', 'p_cms_cust_cd', 'p_cust_name', 'p_new_bcs_acct_no',
                    'p_aprved_amt', 'p_bsn_bal', 'p_expected_amt', 'p_cust_mgr',
                    'p_branch_no', 'p_remarks', 'p_processing_status',
                    'p_processing_status_date'], False),
        'update': (['p_id', 'p_bus_line', 'p_cms_cust_cd', 'p_cust_name', 'p_new_bcs_acct_no',
                    'p_aprved_amt', 'p_bsn_bal', 'p_expected_amt', 'p_cust_mgr',
                    'p_branch_no', 'p_remarks', 'p_processing_status',
                    'p_processing_status_date'], False),
        'status': (['p_id', 'p_processing_status', 'p_processing_status_date'], False),
        'delete': (['p_id'], False),
    },
}

DS_TYPE = {'insert': 'insert', 'update': 'update', 'status': 'update', 'delete': 'delete'}


def call_sql(mod, action, side):
    """CALL sp_{mod}_{action}('${p_...}', ...)

    SP 的日期/数值入参都声明成 VARCHAR，在过程体内 DATE()/NULLIF() 转换，
    所以这儿一律按字符串传，空串/NULL 由 SP 自己兜。
    """
    fixed, has_bt = WRITE_ARGS[mod][action]
    vals = ["'${%s}'" % n for n in fixed]
    if has_bt:
        # business_type 由侧别固定，不由前端传（origin 也是 CONST:1 / CONST:0）
        vals.append("'%s'" % side['business_type'])
    vals.append("'${p_operator}'")
    params = [P(n) for n in fixed]
    if has_bt:
        params.append(P('p_business_type', 'String', side['business_type']))
    params.append(OPERATOR)
    lines, cur = [], []
    for v in vals:
        cur.append(v)
        if len(', '.join(cur)) > 72:
            lines.append(', '.join(cur[:-1]))
            cur = [v]
    if cur:
        lines.append(', '.join(cur))
    return 'CALL sp_%s_%s(\n    %s)' % (mod, action, ',\n    '.join(lines)), params


# ── 系统数据集（两侧完全相同）──────────────────────────────────────────────
# origin 的 branch_no_list 模板参数公式，普惠与零售信贷逐字节相同（md5 一致）：
#   =SQL("whfruser", "select GROUP_CONCAT(...) ... ")
# 它读 whfruser 连接（= common_db）的 whfr_branch_lay / whfr_user / whoa_branch_info。
# 三处调整见 ADJUSTMENTS 第 1、2 条。
SYS_BRANCH_NO_LIST_SQL = (
    'SELECT GROUP_CONCAT(b.branch_no SEPARATOR "\',\'") AS branch_no_list\n'
    'FROM whfr_branch_lay a\n'
    'LEFT JOIN whfr_branch_lay b ON a.branch_no_lay2 = b.branch_no_lay2\n'
    'WHERE a.branch_no = (\n'
    '    SELECT wbi.branch_no COLLATE utf8mb4_0900_ai_ci\n'
    '    FROM whfr_user wu\n'
    '    LEFT JOIN whoa_branch_info wbi ON wu.dept_id = wbi.dept_id\n'
    "    WHERE wu.user_id = '${user_name}' LIMIT 1)")


def common_datasets():
    """与侧别无关的数据集。"""
    return [
        {'name': 'dict_branch', 'type': 'dict', 'db_connection': 'whfruser',
         'sql': 'SELECT branch_no,\n'
                '       CONCAT(branch_nm, "(", branch_no, ")") AS branch_nm\n'
                'FROM whfr_branch_lay',
         'params': []},
        # 列表筛选「机构」。branch_list 是 "0001','0002" 形态，供 SQL 里
        # IN ('${branch_list}') 直接拼 —— origin 的 DICT_BRANCH_LAY2 就是这个约定。
        {'name': 'dict_branch_lay2', 'type': 'dict', 'db_connection': 'whfruser',
         'sql': 'SELECT a.branch_no_lay2,\n'
                '       CONCAT(b.branch_nm, "(", a.branch_no_lay2, ")") AS branch_nm,\n'
                '       a.branch_list\n'
                'FROM (SELECT branch_no_lay2, GROUP_CONCAT(branch_no SEPARATOR "\',\'") '
                'AS branch_list\n'
                '      FROM whfr_branch_lay GROUP BY branch_no_lay2) a\n'
                'LEFT JOIN whfr_branch_lay b ON a.branch_no_lay2 = b.branch_no',
         'params': []},
        {'name': 'dict_oa', 'type': 'dict', 'db_connection': 'common_db',
         'sql': "SELECT CONCAT(a.employee_nm, '(', a.employee_oa, ')') AS employee_nm,\n"
                '       a.employee_oa\nFROM employee_info a',
         'params': []},
        # reserve_project 的「企业标签」。origin 用的是 TableDataDictionary:enterprise_tag
        # —— 一张**表字典**（不是数据集），列名就是 key/value，本机没有这张表，
        # 所以点开是空的（和 smb_cust_acct_no_search 一样属于环境依赖）。
        # 取值口径来自 origin/inclusive_mgmt.sql 的列注释与既有数据：
        # 科技 涉农 绿色 养老 集团 民营 保理 其他。
        # 这里建表并作为数据集暴露（data_writer 只生成数据集，读不到表字典）。
        {'name': 'dict_enterprise_tag', 'type': 'dict', 'db_connection': 'inclusive_mgmt',
         'sql': 'SELECT `key`, `value`\nFROM enterprise_tag\nORDER BY sort_no',
         'params': []},
        # origin 的 branch_no_list 模板参数（=SQL("whfruser", ...)）改造成数据集，
        # 由前端取一次再回填给列表查询；两侧公式一致。
        {'name': 'sys_branch_no_list', 'type': 'dict', 'db_connection': 'whfruser',
         'sql': SYS_BRANCH_NO_LIST_SQL,
         'params': [P('user_name')]},
        # origin 的 forbidden_flag_credit 模板参数（=SQL("inclusive_mgmt", ..., 1, 1)）
        {'name': 'sys_mgmt_config', 'type': 'dict', 'db_connection': 'inclusive_mgmt',
         'sql': 'SELECT config_key, config_value\nFROM mgmt_config\nWHERE status = 1',
         'params': []},
        {'name': 'mgmt_forbidden_set', 'type': 'update', 'db_connection': 'inclusive_mgmt',
         'sql': "CALL sp_mgmt_forbidden_set('${p_config_key}', '${p_config_value}')",
         'params': [P('p_config_key'), P('p_config_value')]},
        # 当前登录人的角色串，给「禁业开关」做权限判定用。
        # origin 是靠模板参数 file_role（=$fine_role）在按钮 JS 里 indexOf 判断的；
        # 加壳后前端由 FR.remoteEvaluate('=$fine_role') 取到角色数组，join(',') 后
        # 当普通参数传进来（见 README「身份参数必须显式传」）。
        {'name': 'sys_user_role', 'type': 'dict', 'db_connection': 'inclusive_mgmt',
         'sql': "SELECT '${fine_role}' AS fine_role",
         'params': [P('fine_role')]},
    ]


def side_datasets(side):
    """侧别相关：客户下拉 + 账户号下拉。"""
    retail = side['name'] == '零售信贷'
    ds = []
    if retail:
        # 零售信贷客户下拉：默认（列表页）用 customer_info/acct_loan_info 且不带机构
        # 条件，add 页用 fact_* 表。表单统一按 add 页口径。
        ds.append({'name': 'dict_customer', 'type': 'dict', 'db_connection': 'assign',
                   'sql': 'SELECT a.customer_no,\n'
                          '       CONCAT(a.customer_name, "-", a.customer_no) AS customer_name\n'
                          'FROM fact_customer_info a\n'
                          'LEFT JOIN fact_acct_loan_info b ON a.customer_no = b.customer_no\n'
                          "WHERE b.acct_no_br = '03'",
                   'params': []})
        # credit_renewal_add 独有：再按当前用户所属机构过滤
        ds.append({'name': 'dict_customer_by_user', 'type': 'dict', 'db_connection': 'assign',
                   'sql': 'SELECT a.customer_no,\n'
                          '       CONCAT(a.customer_name, "-", a.customer_no) AS customer_name\n'
                          'FROM fact_customer_info a\n'
                          'LEFT JOIN fact_acct_loan_info b ON a.customer_no = b.customer_no\n'
                          'LEFT JOIN whfr_user u ON b.branch_no = u.branch_no\n'
                          "WHERE b.acct_no_br = '01' AND u.user_id = '${user_name}'",
                   'params': [P('user_name')]})
        # 客户中文名 → 客户号 反查（表单里「客户名称」与「客户号」是两个控件）
        ds.append({'name': 'dict_customer_no', 'type': 'dict', 'db_connection': 'assign',
                   'sql': 'SELECT a.customer_no\n'
                          'FROM fact_customer_info a\n'
                          'LEFT JOIN fact_acct_loan_info b\n'
                          "       ON a.customer_no = b.customer_no AND b.customer_type = '01'\n"
                          "WHERE a.customer_name = '${cust_chinese_name}'",
                   'params': [P('cust_chinese_name')]})
        ds.append({'name': 'dict_acct', 'type': 'dict', 'db_connection': 'assign',
                   'sql': 'SELECT acct_no\n'
                          'FROM fact_acct_loan_info a\n'
                          'LEFT JOIN fact_customer_info b ON a.customer_no = b.customer_no\n'
                          "WHERE a.acct_no_br = '01' AND a.loan_bal_r >= 0\n"
                          "  AND b.customer_no = '${cust_name}'",
                   'params': [P('cust_name')]})
    else:
        ds.append({'name': 'dict_customer', 'type': 'dict', 'db_connection': 'assign',
                   'sql': 'SELECT a.customer_no,\n'
                          '       CONCAT(a.customer_name, "-", a.customer_no) AS customer_name\n'
                          'FROM fact_customer_info a\n'
                          'LEFT JOIN fact_acct_loan_info b ON a.customer_no = b.customer_no\n'
                          "WHERE b.acct_no_br = '03'",
                   'params': []})
        ds.append({'name': 'dict_acct', 'type': 'dict', 'db_connection': 'assign',
                   'sql': 'SELECT acct_no\n'
                          'FROM fact_acct_loan_info a\n'
                          'LEFT JOIN fact_customer_info b ON a.customer_no = b.customer_no\n'
                          "WHERE a.acct_no_br = '03' AND a.loan_bal_r > 0\n"
                          "  AND b.customer_no = '${cust_name}'",
                   'params': [P('cust_name')]})
    return ds


# ── 两侧的差异声明（唯一的差异源）──────────────────────────────────────────
SIDES = [
    {
        'name': '普惠',
        'module': 'inclusive_mgmt_puhui',
        'dept_dir': 'inclusive_finance_dept',
        # origin 的 IntelliDMLConfig：business_type = CONST:1
        'business_type': '1',
        'admin_role': '普惠条线授信客户精细化管理系统-分行管理员',
        'branch_codes': '0001 / 0002 / TEST01（whfr_branch_lay 口径）',
    },
    {
        'name': '零售信贷',
        'module': 'inclusive_mgmt_retail',
        'dept_dir': 'Retail_credit_dept',
        # origin 的 IntelliDMLConfig：business_type = CONST:0
        'business_type': '0',
        'admin_role': '零售信贷普惠条线授信客户精细化管理系统-分行管理员',
        # 零售信贷业务行的 branch_no 与普惠同属 whfr_branch_lay 编码空间
        # （origin 两侧的 branch_no_list 公式 md5 完全一致，见 SYS_BRANCH_NO_LIST_SQL）
        'branch_codes': '0001 / 0002 / TEST01（与普惠同一编码空间）',
    },
]

TITLES = {
    'credit_renewal': '当季到期续授信情况表',
    'non_profit_conversion': '非两增转回',
    'prepayment': '提前还款项目明细表',
    'reserve_project': '机构储备项目明细表',
}

TABLES = [
    {'name': 'credit_renewal', 'comment': '到期续授信表',
     'columns': [{'name': c, 'type': t} for c, t in
                 [('id', 'bigint unsigned'), ('business_type', 'varchar(10)'),
                  ('cust_name', 'varchar(255)'), ('mt_fac_name', 'varchar(255)'),
                  ('dt_first_disb', 'date'), ('new_bcs_acct_no', 'varchar(255)'),
                  ('dt_maturity', 'date'), ('bsn_bal', 'decimal(16,6)'),
                  ('is_low_risk', 'tinyint(1)'), ('is_dbl_inc', 'tinyint(1)'),
                  ('is_refinance', 'tinyint(1)'), ('refinance_amt', 'decimal(16,6)'),
                  ('declaration_date', 'date'), ('cust_mgr', 'varchar(255)'),
                  ('branch_no', 'varchar(255)'), ('processing_status', 'varchar(255)'),
                  ('processing_status_date', 'datetime'), ('remarks', 'text'),
                  ('created_by', 'varchar(255)'), ('updated_by', 'varchar(255)'),
                  ('is_deleted', 'tinyint(1)')]]},
    {'name': 'non_profit_conversion', 'comment': '非两增转回表（两侧共用，无 business_type）',
     'columns': [{'name': c, 'type': t} for c, t in
                 [('id', 'bigint unsigned'), ('bus_line', 'varchar(255)'),
                  ('cms_cust_cd', 'varchar(255)'), ('cust_name', 'varchar(255)'),
                  ('new_bcs_acct_no', 'varchar(255)'), ('aprved_amt', 'decimal(16,6)'),
                  ('bsn_bal', 'decimal(16,6)'), ('expected_amt', 'decimal(16,6)'),
                  ('cust_mgr', 'varchar(255)'), ('branch_no', 'varchar(255)'),
                  ('remarks', 'text'), ('processing_status', 'varchar(255)'),
                  ('processing_status_date', 'datetime'), ('created_by', 'varchar(255)'),
                  ('updated_by', 'varchar(255)'), ('is_deleted', 'tinyint(1)')]]},
    {'name': 'prepayment', 'comment': '提前还款表',
     'columns': [{'name': c, 'type': t} for c, t in
                 [('id', 'bigint unsigned'), ('business_type', 'varchar(10)'),
                  ('cust_name', 'varchar(255)'), ('mt_fac_name', 'varchar(255)'),
                  ('dt_first_disb', 'date'), ('new_bcs_acct_no', 'varchar(255)'),
                  ('dt_maturity', 'date'), ('bsn_bal', 'decimal(16,6)'),
                  ('is_low_risk', 'tinyint(1)'), ('is_dbl_inc', 'tinyint(1)'),
                  ('cust_mgr', 'varchar(255)'), ('branch_no', 'varchar(255)'),
                  ('processing_status', 'varchar(255)'),
                  ('processing_status_date', 'datetime'),
                  ('expected_repayment_date', 'date'), ('actual_repayment_date', 'date'),
                  ('expected_repayment_amount', 'decimal(16,6)'),
                  ('actual_repayment_amount', 'decimal(16,6)'), ('remarks', 'text'),
                  ('created_by', 'varchar(255)'), ('updated_by', 'varchar(255)'),
                  ('is_deleted', 'tinyint(1)')]]},
    {'name': 'reserve_project', 'comment': '储备项目表',
     'columns': [{'name': c, 'type': t} for c, t in
                 [('id', 'bigint unsigned'), ('business_type', 'varchar(10)'),
                  ('customer_name', 'varchar(255)'), ('is_double_increase', 'tinyint(1)'),
                  ('is_low_risk', 'tinyint(1)'), ('bus_line', 'varchar(255)'),
                  ('net_increase_amount', 'decimal(16,6)'), ('loan_type', 'varchar(255)'),
                  ('expected_declaration_date', 'date'), ('expected_loan_date', 'date'),
                  ('enterprise_tag', 'varchar(20)'), ('cust_mgr', 'varchar(255)'),
                  ('cust_mgr_telephone', 'varchar(20)'), ('branch_no', 'varchar(255)'),
                  ('remarks', 'text'), ('processing_status', 'varchar(255)'),
                  ('processing_status_date', 'datetime'), ('created_by', 'varchar(255)'),
                  ('updated_by', 'varchar(255)'), ('is_deleted', 'tinyint(1)')]]},
    {'name': 'mgmt_config', 'comment': '系统配置表',
     'columns': [{'name': c, 'type': t} for c, t in
                 [('id', 'bigint'), ('config_key', 'varchar(64)'),
                  ('config_value', 'varchar(255)'), ('config_desc', 'varchar(255)'),
                  ('status', 'int')]]},
    # reserve_project「企业标签」下拉的数据源。origin 里是一张**表字典**
    # `enterprise_tag`（列名 key/value，ki=value,vi=key），本机缺失故补建。
    {'name': 'enterprise_tag', 'comment': '企业标签字典（origin 的表字典）',
     'columns': [{'name': c, 'type': t} for c, t in
                 [('id', 'bigint'), ('`key`', 'varchar(50)'), ('`value`', 'varchar(50)'),
                  ('sort_no', 'int')]]},
]


def build(side):
    datasets = []
    for mod in MODULES:
        datasets.append({'name': '%s_list' % mod, 'type': 'list',
                         'db_connection': 'inclusive_mgmt',
                         'sql': list_sql(mod, side),
                         'params': [dict(p) for p in LIST_PARAMS]})
        datasets.append({'name': '%s_count' % mod, 'type': 'stat',
                         'db_connection': 'inclusive_mgmt',
                         'sql': count_sql(mod, side),
                         'params': [dict(p) for p in COUNT_PARAMS]})
        datasets.append({'name': '%s_get' % mod, 'type': 'detail',
                         'db_connection': 'inclusive_mgmt',
                         'sql': get_sql(mod, side),
                         'params': [dict(p) for p in GET_PARAMS]})
        for action in ['insert', 'update', 'status', 'delete']:
            sql, params = call_sql(mod, action, side)
            datasets.append({'name': '%s_%s' % (mod, action), 'type': DS_TYPE[action],
                             'db_connection': 'inclusive_mgmt',
                             'sql': sql, 'params': params})
    datasets += side_datasets(side)
    datasets += common_datasets()

    retail = side['name'] == '零售信贷'
    pages = []
    for mod in MODULES:
        pages.append({
            'name': '%s_list' % mod, 'type': 'list',
            'title': TITLES[mod], 'menu': True,
            'comment': '列表页（服务端分页 + 筛选 + 导出 + 行内动作）',
            'datasets': ['%s_list' % mod, '%s_count' % mod, 'dict_branch_lay2',
                         'sys_branch_no_list', 'sys_mgmt_config', 'mgmt_forbidden_set',
                         'sys_user_role'],
        })
        form_ds = ['%s_get' % mod, '%s_insert' % mod, '%s_update' % mod,
                   '%s_status' % mod, '%s_delete' % mod, 'dict_branch', 'dict_oa']
        if retail and mod == 'credit_renewal':
            form_ds.append('dict_customer_by_user')
        else:
            form_ds.append('dict_customer')
        if mod != 'reserve_project':
            form_ds.append('dict_acct')
        else:
            # reserve_project 的「企业标签」下拉（origin 的 TableDataDictionary:enterprise_tag）
            form_ds.append('dict_enterprise_tag')
        if retail and mod in ('credit_renewal', 'prepayment'):
            form_ds.append('dict_customer_no')
        pages.append({
            'name': '%s_form' % mod, 'type': 'form',
            'title': TITLES[mod], 'modal': True,
            'comment': '表单弹窗，op=add|edit|view|status|delete 五态合一',
            'datasets': form_ds,
        })

    return {
        'project': 'inclusive_mgmt',
        'module': side['module'],
        'version': '1.0.0',
        'created_at': '2026-09-21',
        'backend_type': 'self_built',
        'database': {
            'db_name': 'inclusive_mgmt',
            'tables': TABLES,
            'datasets': datasets,
        },
        'pages': pages,
        'permission': {
            'mode': 'hybrid',
            'dept_field': 'branch_no',
            'role_field': side['admin_role'],
            'description': (
                '分行管理员（角色名见 role_field；non_profit_conversion 两侧都用'
                '「普惠条线授信客户精细化管理系统-分行管理员」）看全部机构；'
                '其他角色按 sys_branch_no_list 解析出的机构范围过滤。判定写在数据集 SQL 里'
                '（INARRAY(角色, SPLIT(fine_role, ",")) = 0 时追加 branch_no IN '
                '(branch_no_list)），与 origin 的 qry_res / pagetool 同句式，只多一层 '
                'SPLIT —— 因为 fine_role 是页面传来的串而非系统参数数组，不裹 SPLIT 时 '
                'INARRAY 返回 #VALUE?、该过滤形同不存在。零售信贷业务行与普惠同属 '
                'whfr_branch_lay 编码空间（%s）。' % side['branch_codes']),
        },
    }


ADJUSTMENTS = """
相对 origin 的改动，只有以下几条，其余逐字沿用：

1. branch_no_list 公式去掉 `whfruser.` 库名前缀。origin 写的是全限定名
   （from whfruser.whfr_branch_lay），现网确实有名为 whfruser 的 schema；本机没有，
   而 FR 连接 whfruser 本身就指向 common_db，非限定名在两侧环境都能跑。

2. branch_no_list 公式加一处显式 COLLATE。whfr_branch_lay 是 utf8mb4_0900_ai_ci，
   whoa_branch_info 是 utf8mb4_unicode_ci，直接比较报「Illegal mix of collations」。
   机构号是纯 ASCII，强制排序规则不改变比较结果，现网执行同样安全。
   （common_db.whfr_user 在本项目里按 unicode_ci 建，与 whoa_branch_info 一致，
   这一处不需要 COLLATE。）

3. prepayment 的列表补 ORDER BY id DESC。origin 没写 ORDER BY，MySQL 不保证返回
   顺序，翻页会出现重复行/漏行。credit_renewal、reserve_project 原就有 ORDER BY，
   npc 也有。

4. 列表/详情 SQL 由 SELECT * 改为显式列清单。带 JOIN 时 SELECT * 会同时返回
   whoa_branch_info.id / branch_no 与业务表同名列，/api_data 返回 JSON 对象时后者
   覆盖前者，前端拿到的 row.id 静默变成机构表主键。

5. origin 的模板参数 branch_no_list（=SQL("whfruser", ...)）与 forbidden_flag_credit
   （=SQL("inclusive_mgmt", ...)）改为数据集 sys_branch_no_list / sys_mgmt_config，
   由前端取一次再回填 —— 加壳后不再有 FR 模板参数。

6. 导出：origin 用 pp_cutpage 非空跳过 LIMIT 取全量（credit_renewal / prepayment /
   reserve_project），npc 用 pagecut.output_excel()。加壳后统一改为前端取全量后
   客户端导出，调用方式为 pp_pageno=1 / pp_pagesize=100000。
"""

if __name__ == '__main__':
    os.makedirs(DOCS, exist_ok=True)
    for s in SIDES:
        task = build(s)
        out = os.path.join(DOCS, 'dev_task_%s.json' % s['name'])
        with open(out, 'w', encoding='utf-8', newline='\n') as fh:
            json.dump(task, fh, ensure_ascii=False, indent=2)
            fh.write('\n')
        print('%s\n   -> %d 数据集 / %d 页面' % (out, len(task['database']['datasets']),
                                                 len(task['pages'])))
        for d in task['database']['datasets']:
            first = d['sql'].split('\n')[0]
            print('      %-28s %-7s %s' % (d['name'], d['type'], first[:74]))
