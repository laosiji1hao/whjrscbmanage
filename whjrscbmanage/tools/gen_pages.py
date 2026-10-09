# -*- coding: utf-8 -*-
"""生成 16 个壳页面（4 模块 × list/form × 2 侧）。

用生成器而不是手写 16 份，是为了：
  1. 两侧的差异集中在一处声明，逐条可审；
  2. 公共运行时（PATH 守卫、/api/data 调用、SQL IN 列表拼装、导出）只有一份，
     不会在 16 个文件里各自漂移；
  3. 改一处能整体重生，diff 干净。

输出：$FR_PROJECTS_DIR/inclusive_mgmt/pages/{侧}/<模块>_{list,form}.jsx
编译：scripts/display/display_writer.py --jsx <in> --output <out.cpt>
"""
import io
import os
import sys

sys.stdout = open(1, 'w', encoding='utf-8', errors='replace', closefd=False)

OUT_ROOT = r'E:\projects\FineFile\inclusive_mgmt\pages'

# ── 侧别配置 ────────────────────────────────────────────────────────────────
SIDES = {
    '普惠': {
        'dept': 'inclusive_finance_dept',
        'module': 'inclusive_mgmt_puhui',
        'data_cpt': 'inclusive_mgmt_puhui_data.cpt',
        'business_type': '1',
        'admin_role': '普惠条线授信客户精细化管理系统-分行管理员',
        # PATH.currentDir 的兜底：决策平台菜单打开时 reportName 取不到，必须写死本侧路径
        'pages_dir': 'busi_center/inclusive_finance_dept/inclusive_mgmt/pages/',
        # 列表页是否有「禁业开关 + 批量删除」（origin 只有普惠三模块有）
        'forbidden': True,
        # 列表 SQL 是否 join 了 whoa_branch_info（有 dept_name 列）
        'dept_name': True,
    },
    '零售信贷': {
        'dept': 'Retail_credit_dept',
        'module': 'inclusive_mgmt_retail',
        'data_cpt': 'inclusive_mgmt_retail_data.cpt',
        'business_type': '0',
        'admin_role': '零售信贷普惠条线授信客户精细化管理系统-分行管理员',
        'pages_dir': 'busi_center/Retail_credit_dept/inclusive_mgmt/pages/',
        'forbidden': False,
        'dept_name': False,
    },
}

# 零售侧把「退回补充资料」从状态字典里去掉了（origin 逐字如此）
RET_DROP = '退回补充资料'

FULL_STATUS = ['营销中', '待申报', '审批中', '退回补充资料', '已批准', '已发放']
LIST_STATUS = {
    'credit_renewal': FULL_STATUS,
    'non_profit_conversion': ['营销中', '待申报', '审批中', '已批准', '已发放'],
    'prepayment': ['待提交申请', '已提交申请', '已批准', '已办理'],
    'reserve_project': FULL_STATUS,
}
FORM_STATUS = {
    'credit_renewal': ['待申报', '审批中', '退回补充资料', '已批准', '已办理'],
    'non_profit_conversion': ['待申报', '审批中', '已办理'],
    'prepayment': ['待提交申请', '已提交申请', '已批准', '已办理'],
    'reserve_project': FULL_STATUS,
}

MODULE_META = {
    'credit_renewal': {
        'title': '当季到期续授信情况表',
        'noun': '到期续授信',
        'config_key': 'forbidden_flag_credit',      # origin 的 mgmt_config 键名
        'date_filter': True,                        # origin 只有该模块列表有到期日筛选
        'gated': True,                              # 新增/行内动作受禁业开关约束（普惠）
    },
    'non_profit_conversion': {
        'title': '非两增转回',
        'noun': '非两增转回',
        'config_key': None,                         # 原版没有禁业开关
        'date_filter': False,
        'gated': False,
    },
    'prepayment': {
        'title': '提前还款项目明细表',
        # origin 的新增按钮文案是「新增提前还款」（没有「项目」二字），照抄
        'noun': '提前还款',
        'config_key': 'forbidden_flag_prpayment',   # origin 拼写如此（prpayment），沿用
        'date_filter': False,
        'gated': True,
    },
    'reserve_project': {
        'title': '机构储备项目明细表',
        'noun': '储备项目',
        'config_key': 'forbidden_flag_reserve',
        'date_filter': False,
        'gated': True,
    },
}

# ── 字段定义 ────────────────────────────────────────────────────────────────
# kind: text / number / date / datetime / textarea / pick（内联选项）/ ref（数据集下拉）
# ref 的 dict 形如 (数据集, 值字段, 文本字段, 依赖字段或 None)
YN = [('true', '是'), ('false', '否')]


def f(name, label, kind, **kw):
    d = {'name': name, 'label': label, 'kind': kind,
         'required': kw.get('required', False),
         'dict': kw.get('dict'),
         'options': kw.get('options'),
        'cond': kw.get('cond'),          # ('is_refinance', 'true') → 联动必填
         'default': kw.get('default', ''),
         'half': kw.get('half', True)}    # 是否只占半行（origin 是两列布局）
    return d


FIELDS = {
    ('普惠', 'credit_renewal'): [
        f('cust_name', '客户名称', 'ref', dict=('dict_customer', 'customer_no', 'customer_name', None), required=True),
        f('new_bcs_acct_no', '账户号', 'ref', dict=('dict_acct', 'acct_no', 'acct_no', 'cust_name'), required=True),
        f('mt_fac_name', '业务种类', 'text', required=True),
        f('dt_first_disb', '发放日期', 'date', required=True),
        f('dt_maturity', '到期日期', 'date', required=True),
        f('bsn_bal', '业务余额（万元）', 'number', required=True),
        f('is_low_risk', '是否特别授信业务', 'pick', options=YN, required=True),
        f('is_dbl_inc', '是否两增', 'pick', options=YN, required=True),
        f('is_refinance', '是否续贷', 'pick', options=YN, required=True),
        f('refinance_amt', '续贷金额（万元）', 'number'),
        f('declaration_date', '申报时间', 'date', cond=('is_refinance', 'true')),
        f('cust_mgr', '责任人', 'ref', dict=('dict_oa', 'employee_oa', 'employee_nm', None), required=True),
        f('branch_no', '经办行', 'ref', dict=('dict_branch', 'branch_no', 'branch_nm', None), required=True),
        f('processing_status', '办理状态', 'pick', cond=('is_refinance', 'true')),
        f('processing_status_date', '当前状态办理时间', 'datetime', cond=('is_refinance', 'true')),
        f('remarks', '备注', 'textarea', half=False),
    ],
    ('零售信贷', 'credit_renewal'): [
        # 零售的「客户名称」是自由文本，再用它过滤出「客户号」下拉（DICT_CUSTOMER_NO）
        f('cust_chinese_name', '客户名称', 'text', required=True),
        f('cust_name', '客户号', 'ref', dict=('dict_customer_no', 'customer_no', 'customer_no', 'cust_chinese_name'), required=True),
        f('new_bcs_acct_no', '账户号', 'ref', dict=('dict_acct', 'acct_no', 'acct_no', 'cust_name'), required=True),
        f('mt_fac_name', '业务种类', 'text', required=True),
        f('dt_maturity', '到期日期', 'date', required=True),
        f('dt_first_disb', '发放日期', 'date', required=True),
        f('is_low_risk', '是否特别授信业务', 'pick', options=YN, required=True),
        f('bsn_bal', '业务余额（万元）', 'number', required=True),
        f('is_refinance', '是否续贷', 'pick', options=YN, required=True),
        f('is_dbl_inc', '是否两增', 'pick', options=YN, required=True),
        f('declaration_date', '申报时间', 'date', cond=('is_refinance', 'true')),
        f('refinance_amt', '续贷金额（万元）', 'number'),
        f('branch_no', '经办行', 'ref', dict=('dict_branch', 'branch_no', 'branch_nm', None), required=True),
        f('cust_mgr', '责任人', 'ref', dict=('dict_oa', 'employee_oa', 'employee_nm', None), required=True),
        f('processing_status_date', '当前状态办理时间', 'datetime', cond=('is_refinance', 'true')),
        f('processing_status', '办理状态', 'pick', cond=('is_refinance', 'true')),
        f('remarks', '备注', 'textarea', half=False),
    ],
    ('普惠', 'non_profit_conversion'): [
        f('cust_name', '客户名称', 'ref', dict=('dict_customer', 'customer_no', 'customer_name', None), required=True),
        f('new_bcs_acct_no', '账户号', 'ref', dict=('dict_acct', 'acct_no', 'acct_no', 'cust_name'), required=True),
        f('cms_cust_cd', '客户编号', 'text', required=True),
        f('bus_line', '所属条线', 'pick', options=[('公司', '公司'), ('普惠', '普惠')], required=True),
        f('aprved_amt', '授信金额（万元）', 'number', required=True),
        f('bsn_bal', '业务余额（万元）', 'number', required=True),
        f('expected_amt', '授信后预计余额（万元）', 'number', required=True),
        f('cust_mgr', '责任人', 'ref', dict=('dict_oa', 'employee_oa', 'employee_nm', None), required=True),
        f('branch_no', '经办行', 'ref', dict=('dict_branch', 'branch_no', 'branch_nm', None), required=True),
        f('processing_status', '办理状态', 'pick', required=True),
        f('processing_status_date', '当前状态办理时间', 'datetime', required=True),
        f('remarks', '备注', 'textarea', half=False),
    ],
    ('零售信贷', 'non_profit_conversion'): [
        f('cust_name', '客户名称', 'ref', dict=('dict_customer', 'customer_no', 'customer_name', None), required=True),
        f('new_bcs_acct_no', '账户号', 'ref', dict=('dict_acct', 'acct_no', 'acct_no', 'cust_name'), required=True),
        f('cms_cust_cd', '客户编号', 'text', required=True),
        f('bus_line', '所属条线', 'pick', options=[('公司', '公司'), ('普惠', '普惠')], required=True),
        f('aprved_amt', '授信金额（万元）', 'number', required=True),
        f('bsn_bal', '业务余额（万元）', 'number', required=True),
        f('expected_amt', '授信后预计余额（万元）', 'number', required=True),
        f('cust_mgr', '责任人', 'ref', dict=('dict_oa', 'employee_oa', 'employee_nm', None), required=True),
        f('branch_no', '经办行', 'ref', dict=('dict_branch', 'branch_no', 'branch_nm', None), required=True),
        f('processing_status', '办理状态', 'pick', required=True),
        f('processing_status_date', '当前状态办理时间', 'datetime', required=True),
        f('remarks', '备注', 'textarea', half=False),
    ],
    ('普惠', 'prepayment'): [
        f('cust_name', '客户名称', 'ref', dict=('dict_customer', 'customer_no', 'customer_name', None), required=True),
        f('new_bcs_acct_no', '账户号', 'ref', dict=('dict_acct', 'acct_no', 'acct_no', 'cust_name'), required=True),
        f('mt_fac_name', '业务种类', 'text', required=True),
        f('dt_first_disb', '发放日期', 'date', required=True),
        f('dt_maturity', '到期日期', 'date', required=True),
        f('bsn_bal', '业务余额（万元）', 'number', required=True),
        f('is_low_risk', '是否特别授信业务', 'pick', options=YN, required=True),
        f('is_dbl_inc', '是否两增', 'pick', options=YN, required=True),
        f('expected_repayment_date', '预计还款时间', 'date', required=True),
        f('actual_repayment_date', '实际还款时间', 'date', required=True),
        f('expected_repayment_amount', '预计还款金额（万元）', 'number', required=True),
        f('actual_repayment_amount', '实际还款金额（万元）', 'number', required=True),
        f('cust_mgr', '责任人', 'ref', dict=('dict_oa', 'employee_oa', 'employee_nm', None), required=True),
        f('branch_no', '经办行', 'ref', dict=('dict_branch', 'branch_no', 'branch_nm', None), required=True),
        f('processing_status', '办理状态', 'pick', required=True),
        f('processing_status_date', '当前状态办理时间', 'datetime', required=True),
        f('remarks', '备注', 'textarea', half=False),
    ],
    ('零售信贷', 'prepayment'): [
        # 零售的「客户名称」是自由文本 + 客户号下拉；本页客户号在前（origin 逐字如此，
        # 与 credit_renewal 的先后正好相反）
        f('cust_name', '客户号', 'ref', dict=('dict_customer_no', 'customer_no', 'customer_no', 'cust_chinese_name'), required=True),
        f('cust_chinese_name', '客户名称', 'text', required=True),
        f('new_bcs_acct_no', '账户号', 'ref', dict=('dict_acct', 'acct_no', 'acct_no', 'cust_name'), required=True),
        f('mt_fac_name', '业务种类', 'text', required=True),
        f('dt_first_disb', '发放日期', 'date', required=True),
        f('dt_maturity', '到期日期', 'date', required=True),
        f('bsn_bal', '业务余额（万元）', 'number', required=True),
        f('is_low_risk', '是否特别授信业务', 'pick', options=YN, required=True),
        f('is_dbl_inc', '是否两增', 'pick', options=YN, required=True),
        f('expected_repayment_date', '预计还款时间', 'date', required=True),
        f('actual_repayment_date', '实际还款时间', 'date', required=True),
        f('expected_repayment_amount', '预计还款金额（万元）', 'number', required=True),
        f('actual_repayment_amount', '实际还款金额（万元）', 'number', required=True),
        f('cust_mgr', '责任人', 'ref', dict=('dict_oa', 'employee_oa', 'employee_nm', None), required=True),
        f('branch_no', '经办行', 'ref', dict=('dict_branch', 'branch_no', 'branch_nm', None), required=True),
        f('processing_status', '办理状态', 'pick', required=True),
        f('processing_status_date', '当前状态办理时间', 'datetime', required=True),
        f('remarks', '备注', 'textarea', half=False),
    ],
    # 储备项目：客户是 dict_customer 下拉（存 customer_no），两侧一致。
    # 普惠多「责任人联系电话」+「企业标签 / 选其他时手填」；零售这两个控件**不存在**
    # （origin 的零售 add 页就没有，但 SP 里仍有 p_cust_mgr_telephone / p_enterprise_tag，
    #   所以零售提交时这两个参数发空串，与 origin 的实际效果一致）。
    ('普惠', 'reserve_project'): [
        f('customer_name', '客户', 'ref', dict=('dict_customer', 'customer_no', 'customer_name', None), required=True),
        f('is_double_increase', '是否两增', 'pick', options=YN, required=True),
        f('bus_line', '所属条线', 'pick', options=[('公司', '公司'), ('普惠', '普惠')], required=True),
        f('is_low_risk', '是否特别授信业务', 'pick', options=YN, required=True),
        f('net_increase_amount', '金额（净增）（万元）', 'number', required=True),
        f('loan_type', '贷款类型', 'text', required=True, default='流贷'),
        f('expected_declaration_date', '预计申报时间', 'date', required=True),
        f('expected_loan_date', '预计放款时间', 'date', required=True),
        f('cust_mgr', '责任人', 'ref', dict=('dict_oa', 'employee_oa', 'employee_nm', None), required=True),
        # origin 的这个控件 Label 文本就是 '*'（漏写标签，拿必填星号当了标签），补回真标签
        f('cust_mgr_phone', '责任人联系电话', 'text', required=True),
        f('enterprise_tag', '企业标签', 'ref', dict=('dict_enterprise_tag', 'value', 'key', None), required=True),
        f('enterprise_tag_other', '企业标签（选“其他”时请手动填写）', 'text'),
        f('branch_no', '经办行', 'ref', dict=('dict_branch', 'branch_no', 'branch_nm', None), required=True),
        f('processing_status', '办理状态', 'pick', required=True),
        f('processing_status_date', '当前状态办理时间', 'datetime', required=True),
        f('remarks', '备注', 'textarea', half=False),
    ],
    ('零售信贷', 'reserve_project'): [
        f('customer_name', '客户', 'ref', dict=('dict_customer', 'customer_no', 'customer_name', None), required=True),
        f('is_double_increase', '是否两增', 'pick', options=YN, required=True),
        f('bus_line', '所属条线', 'pick', options=[('公司', '公司'), ('普惠', '普惠')], required=True),
        f('is_low_risk', '是否特别授信业务', 'pick', options=YN, required=True),
        f('net_increase_amount', '金额（净增）（万元）', 'number', required=True),
        # origin 的 Label 文本是 '*'，且默认值两侧不同（普惠「流贷」/ 零售「个人经营性」）
        f('loan_type', '贷款类型', 'text', required=True, default='个人经营性'),
        f('expected_declaration_date', '预计申报时间', 'date', required=True),
        f('expected_loan_date', '预计放款时间', 'date', required=True),
        f('cust_mgr', '责任人', 'ref', dict=('dict_oa', 'employee_oa', 'employee_nm', None), required=True),
        f('branch_no', '经办行', 'ref', dict=('dict_branch', 'branch_no', 'branch_nm', None), required=True),
        f('processing_status', '办理状态', 'pick', required=True),
        f('processing_status_date', '当前状态办理时间', 'datetime', required=True),
        f('remarks', '备注', 'textarea', half=False),
    ],
}

# widget 名 → 存储过程参数名（只有储备项目不同）
PARAM_ALIAS = {'cust_mgr_phone': 'cust_mgr_telephone'}

# 不落库的辅助控件（origin 的 enterprise_tag_other 从不落库）
NON_DB_FIELDS = {'enterprise_tag_other'}

# ── 列表列定义 ──────────────────────────────────────────────────────────────
# (标题, 字段, 宽度, 渲染器)  渲染器: None=文本 / 'yn'=是/否 / 'dt'=日期时间
def col(title, key, width=120, render=None):
    return {'title': title, 'key': key, 'width': width, 'render': render}


LIST_COLUMNS = {
    # 零售侧「经办行」取 branch_no（列表 SQL 没 join 机构表）；普惠侧取 dept_name
    'credit_renewal': [
        col('客户名称', 'cust_name', 160),
        col('账户号', 'new_bcs_acct_no', 150),
        col('业务种类', 'mt_fac_name', 110),
        col('发放日期', 'dt_first_disb', 105, 'dt'),
        col('到期日期', 'dt_maturity', 105, 'dt'),
        col('业务余额（万元）', 'bsn_bal', 120),
        col('是否特别授信业务', 'is_low_risk', 140, 'yn'),
        col('是否两增', 'is_dbl_inc', 90, 'yn'),
        col('是否续贷', 'is_refinance', 90, 'yn'),
        col('续贷金额（万元）', 'refinance_amt', 120),
        col('申报时间', 'declaration_date', 105, 'dt'),
        col('责任人', 'cust_mgr', 100),
        col('经办行', None, 170),          # 侧别决定 dept_name / branch_no
        col('备注', 'remarks', 140),
        col('办理状态', 'processing_status', 110),
        col('当前状态办理时间', 'processing_status_date', 160, 'dt'),
    ],
    'non_profit_conversion': [
        col('客户编号', 'cms_cust_cd', 110),
        col('客户名称', 'cust_name', 160),
        col('账户号', 'new_bcs_acct_no', 150),
        col('授信金额（万元）', 'aprved_amt', 120),
        col('业务余额（万元）', 'bsn_bal', 120),
        col('授信后预计余额（万元）', 'expected_amt', 150),
        col('所属条线', 'bus_line', 90),
        col('责任人', 'cust_mgr', 100),
        col('经办行', None, 170),
        col('备注', 'remarks', 140),
        col('办理状态', 'processing_status', 110),
        col('当前状态办理时间', 'processing_status_date', 160, 'dt'),
    ],
    'prepayment': [
        col('客户名称', 'cust_name', 160),
        col('账户号', 'new_bcs_acct_no', 150),
        col('业务种类', 'mt_fac_name', 110),
        col('发放日期', 'dt_first_disb', 105, 'dt'),
        col('到期日期', 'dt_maturity', 105, 'dt'),
        col('业务余额（万元）', 'bsn_bal', 120),
        col('是否特别授信业务', 'is_low_risk', 140, 'yn'),
        col('是否两增', 'is_dbl_inc', 90, 'yn'),
        col('预计还款时间', 'expected_repayment_date', 110, 'dt'),
        col('实际还款时间', 'actual_repayment_date', 110, 'dt'),
        col('预计还款金额（万元）', 'expected_repayment_amount', 140),
        col('实际还款金额（万元）', 'actual_repayment_amount', 140),
        col('责任人', 'cust_mgr', 100),
        col('经办行', None, 170),
        col('备注', 'remarks', 140),
        col('办理状态', 'processing_status', 110),
        col('当前状态办理时间', 'processing_status_date', 160, 'dt'),
    ],
    'reserve_project': [
        col('经办行', None, 170),
        col('客户', 'customer_name', 160),
        col('是否两增', 'is_double_increase', 90, 'yn'),
        col('是否特别授信业务', 'is_low_risk', 140, 'yn'),
        col('客户金额（净增）（万元）', 'net_increase_amount', 160),
        col('贷款类型', 'loan_type', 100),
        col('预计申报时间', 'expected_declaration_date', 120, 'dt'),
        col('预计放款时间', 'expected_loan_date', 120, 'dt'),
        col('企业标签', 'enterprise_tag', 100),
        col('责任人', 'cust_mgr', 100),
        col('责任人联系电话', 'cust_mgr_telephone', 130),
        col('办理状态', 'processing_status', 110),
        col('当前状态办理时间', 'processing_status_date', 160, 'dt'),
        col('所属条线', 'bus_line', 90),
        col('备注', 'remarks', 140),
    ],
}


def pyval(v):
    """Python 字面量 → JS 字面量（只用于本文件里的纯数据）。"""
    import json
    return json.dumps(v, ensure_ascii=False)


# 零售储备项目的列表没有这两列（其 add 页也没有这两个控件，origin 逐字如此）
DROP_COLS = {
    ('零售信贷', 'reserve_project'): {'企业标签', '责任人联系电话'},
}
