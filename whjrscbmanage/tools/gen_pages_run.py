# -*- coding: utf-8 -*-
"""gen_pages 的发射端：把 FIELDS / LIST_COLUMNS / contract 拼成 16 个 .jsx。

设计约束（踩过的坑，勿动）：
  1. 提交参数表**从 contract_*.json 反推**，不手写 —— 数据集声明才是权威；
     type=='formula' 的参数（p_operator / fine_role）前端一律不发，由服务端按会话求值。
  2. `.jsx` 必须**完全自包含**：display_writer 会把整段 <Content> 换成编译产物，
     骨架的 PATH / hideStyle / appRoot 一概不会被注入。
  3. `const [a,b] = React.useState(...)` 必须写成 const —— display_writer 的
     解构转换正则只认 const；且初始化表达式里不能出现 `);`。
"""
import io
import json
import os
import sys

sys.stdout = open(1, 'w', encoding='utf-8', errors='replace', closefd=False)

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import gen_pages as G          # noqa: E402
import page_tpl as T           # noqa: E402

MODS = ['credit_renewal', 'non_profit_conversion', 'prepayment', 'reserve_project']

# 身份参数：值由 page_tpl 的 callData 统一注入（来自 FR.remoteEvaluate），
# 所以生成器不再发它们。名单要与 gen_dev_task.IDENTITY_PARAMS 和
# page_tpl.RUNTIME 里 IDENTITY 的三处注入保持一致 —— 三处分属两种语言，
# 没法真正共享一个常量，改名字时三处一起改。
IDENTITY_PARAMS = ('p_operator', 'fine_role', 'user_name')

SIDE_DIR = {'普惠': 'puhui', '零售信贷': 'retail'}


def load_contract(side):
    p = os.path.join(HERE, 'contract_%s.json' % side)
    with open(p, encoding='utf-8') as fh:
        return json.load(fh)


def js(v):
    return json.dumps(v, ensure_ascii=False)


def s_(expr):
    """值 → 提交用的字符串（None/undefined 一律空串，SP 的 p_* 都是 String）。"""
    return "(function(v){ return (v === undefined || v === null) ? '' : String(v); })(%s)" % expr


# ── 参数名 ↔ 控件名 ─────────────────────────────────────────────────────────
REV_ALIAS = {v: k for k, v in G.PARAM_ALIAS.items()}


def widget_of(param):
    """p_cust_mgr_telephone → cust_mgr_phone"""
    w = param[2:]                      # 去掉 p_
    return REV_ALIAS.get(w, w)


def kind_of(side, mod, widget):
    for f in G.FIELDS[(side, mod)]:
        if f['name'] == widget:
            return f['kind']
    return None


def value_expr(side, mod, widget, src):
    """按字段类型把表单值转成提交串。src 是取值表达式（values.x 或 d.x）。"""
    k = kind_of(side, mod, widget)
    if k == 'date':
        return "fmtDate(%s)" % src
    if k == 'datetime':
        return "fmtDate(%s, true)" % src
    return s_(src)


# ── 参数表：一律从 contract 反推，绝不手写 ──────────────────────────────────
# 业务参数按数据集声明逐条生成（少发会取空值 —— /api/data 不采用任何默认值）。
# **身份参数**（p_operator / fine_role / user_name）跳过：它们不由这里发，
# 而是由 page_tpl 的 callData 统一注入（值来自 FR.remoteEvaluate）。
# 两处都发会在 parameters 里出现重复项，所以这里必须跳过。见 IDENTITY_PARAMS。
LIST_VALUE = {
    'processing_status': "sqlList(status)",
    'branch_list': "sqlList(branchLay2)",
    'start_date': "startDate ? startDate.format('YYYY-MM-DD') : ''",
    'end_date': "endDate ? endDate.format('YYYY-MM-DD') : ''",
    'pp_pageno': "page",
    'pp_pagesize': "size",
    'branch_no_list': "scopeBranch",
}

# 状态变更弹窗：values 来自 validateFields，四个参数都在作用域内
FORM_VALUE = {
    'p_id': "String(recordId)",
    'p_business_type': "BUSINESS_TYPE",
    'p_processing_status': "values.processing_status || ''",
    'p_processing_status_date': "fmtDate(values.processing_status_date, true)",
}

# 删除弹窗：走的是 handleSubmit 里 validateFields 之前的分支，**没有 values**。
# 故意只给这两个键 —— 若某个 delete 数据集多声明了别的参数，这里会当场报错，
# 而不是生成一段引用未定义变量的代码。
DELETE_VALUE = {
    'p_id': "String(recordId)",
    'p_business_type': "BUSINESS_TYPE",
}


def params_js(side, mod, which, value_map, indent, skip=IDENTITY_PARAMS, extra=None):
    """按数据集声明生成 parameters 数组字面量。extra 是 {参数名: (type, expr)} 覆盖。"""
    contract = load_contract(side)
    ds = contract['datasets'][mod + '_' + which]
    lines = []
    for name, typ, default in ds['params']:
        if typ == 'formula' or name in skip or name in IDENTITY_PARAMS:
            continue
        if extra and name in extra:
            t, expr = extra[name]
        else:
            expr = value_map.get(name)
            t = 'Integer' if typ == 'Integer' else 'String'
        if expr is None:
            raise SystemExit('参数 %s 没有取值表达式（%s/%s）' % (name, side, which))
        lines.append("%s{ name: %s, type: %s, value: %s },"
                     % (indent, js(name), js(t), expr))
    return '\n'.join(lines)


def col_js(c, side):
    key = c['key']
    if key is None:
        key = 'dept_name' if G.SIDES[side]['dept_name'] else 'branch_no'
    d = {'title': c['title'], 'dataIndex': key, 'key': key, 'width': c['width'],
         'ellipsis': True}
    # c['render'] 是 'dt'/'yn' 这类**标记串**（导出 CSV 时当参数用），
    # 表格的 render 必须是真函数 —— 直接把标记串塞给 antd 会在渲染时炸
    # 「c is not a function」（antd Table 内部直接调用它）。两者共用 fmtCell。
    if c['render']:
        return ("    columns.push(Object.assign(%s, "
                "{ render: function(v) { return fmtCell(v, %s); } }));"
                % (js(d), js(c['render'])))
    return "    columns.push(%s);" % js(d)


def list_cols_js(side, mod):
    drop = G.DROP_COLS.get((side, mod), set())
    out = []
    for c in G.LIST_COLUMNS[mod]:
        if c['title'] in drop:
            continue
        out.append(col_js(c, side))
    return '\n'.join(out)


def export_cols_js(side, mod):
    """导出用全量列（含被隐藏的键），渲染器与表格一致。"""
    drop = G.DROP_COLS.get((side, mod), set())
    out = []
    for c in G.LIST_COLUMNS[mod]:
        if c['title'] in drop:
            continue
        key = c['key']
        if key is None:
            key = 'dept_name' if G.SIDES[side]['dept_name'] else 'branch_no'
        out.append(js({'title': c['title'], 'key': key, 'render': c['render']}))
    return '[\n        ' + ',\n        '.join(out) + '\n    ]'


def status_opts_js(lst):
    return js([{'value': x, 'label': x} for x in lst])


def scroll_x(mod):
    n = len(G.LIST_COLUMNS[mod])
    return 60 + 118 + 180 + n * 130


# ── 表单页 ──────────────────────────────────────────────────────────────────
def dep_meta_js(side, mod):
    d = {}
    for f in G.FIELDS[(side, mod)]:
        if f['kind'] == 'ref' and f['dict'] and f['dict'][3]:
            ds, val, txt, dep = f['dict']
            d[f['name']] = {'ds': ds, 'param': dep, 'value': val, 'text': txt}
    return js(d)


def dep_trigger_js(side, mod):
    """反查表：被改变的那个字段 → 需要跟着重载的下级字段。
    DEP_META 是按**下级字段**建键的，onValuesChange 拿到的是**被改动的字段**，
    直接查 DEP_META 永远查不到（这是之前联动失效的原因）。"""
    t = {}
    for f in G.FIELDS[(side, mod)]:
        if f['kind'] == 'ref' and f['dict'] and f['dict'][3]:
            t.setdefault(f['dict'][3], []).append(f['name'])
    return js(t)


def plain_refs(side, mod):
    """无依赖的 ref 字段 → 挂载时一次性取全量选项。"""
    out = []
    for f in G.FIELDS[(side, mod)]:
        if f['kind'] == 'ref' and f['dict'] and not f['dict'][3]:
            ds, val, txt, _ = f['dict']
            out.append((f['name'], ds, val, txt))
    return out


def load_options_js(side, mod):
    lines = []
    for name, ds, val, txt in plain_refs(side, mod):
        lines.append("        callData(%s, [], function(rows) {" % js(ds))
        lines.append("            setOptions(function(p) {")
        lines.append("                var n = Object.assign({}, p);")
        lines.append("                n[%s] = rows.map(function(r) { return { value: r[%s], label: r[%s] }; });"
                     % (js(name), js(val), js(txt)))
        lines.append("                return n;")
        lines.append("            });")
        lines.append("        }, null);")
    # 有依赖的 ref 字段：若详情已带回依赖值，挂载时补取一次
    for f in G.FIELDS[(side, mod)]:
        if f['kind'] == 'ref' and f['dict'] and f['dict'][3]:
            dep = f['dict'][3]
            lines.append("        if (v && v[%s]) loadDep(%s, v[%s]);" % (js(dep), js(f['name']), js(dep)))
    return '\n'.join(lines)


# origin 的 8 个 _add 页里，processing_status_date 这个 DateEditor 都带默认值公式 =NOW()
# （逐文件核对过）。丢了它，「是否续贷=否」时该字段合法为空 → 空串落库 →
# DATE('') 得 NULL → 撞 NOT NULL 的 datetime 列 → MySQL 1292 Incorrect datetime value: ''
NOW_DEFAULT = ('processing_status_date',)

# 状态变更弹窗要渲染的字段：与 origin 的 _status.cpt 一一对应
STATUS_FORM_FIELDS = frozenset(('processing_status', 'processing_status_date'))


def defaults_js(side, mod):
    """新增态的初始值。返回**赋值语句**而非对象字面量：
    processing_status_date 的 origin 默认值是公式 =NOW()，只能在运行时求值。"""
    lines = []
    for f in G.FIELDS[(side, mod)]:
        n = f['name']
        if n in NOW_DEFAULT:
            lines.append('            v[%s] = dayjs();   // origin: DateEditor 默认值公式 =NOW()'
                         % js(n))
            continue
        if f['kind'] == 'date' or f['kind'] == 'datetime':
            continue
        if f['default']:
            lines.append('            v[%s] = %s;' % (js(n), js(f['default'])))
    return '\n'.join(lines)


def load_map_js(side, mod):
    """详情回填：把 _get 返回的行转成表单值。"""
    lines = []
    for f in G.FIELDS[(side, mod)]:
        n = f['name']
        k = f['kind']
        if k == 'date' or k == 'datetime':
            lines.append("                v[%s] = toDay(d[%s]);" % (js(n), js(n)))
        elif k == 'number':
            lines.append("                v[%s] = (d[%s] === null || d[%s] === undefined || d[%s] === '') "
                         "? null : Number(d[%s]);" % ((js(n),) * 5))
        else:
            lines.append("                v[%s] = d[%s];" % (js(n), js(n)))
    # 零售：客户名称由 detail SQL join 出来的 customer_name 带回（页面控件名是 cust_chinese_name）
    if side == '零售信贷' and kind_of(side, mod, 'cust_chinese_name'):
        lines.append("                if (d.customer_name !== undefined) v.cust_chinese_name = d.customer_name;")
    return '\n'.join(lines)


def validate_js(side, mod):
    """忠实移植 origin 的 fieldArray 必填检查。
    origin 里 `widget[element]A` / `[]A` 是两处语法错误，整段 JS 从未生效过；
    这里按它的**本意**实现（去掉杂散的 A），并保留「是否特别授信业务）」那个多余的右括号。"""
    lines = []
    for f in G.FIELDS[(side, mod)]:
        n, k = f['name'], f['kind']
        msg = f['label']
        if n == 'is_low_risk':
            msg = '是否特别授信业务）'      # origin 原文就多一个右括号，照抄
        expr = "values[%s]" % js(n)
        if k in ('date', 'datetime'):
            expr = "toDay(values[%s])" % js(n)
        elif k == 'number':
            expr = "(values[%s] === null || values[%s] === undefined) ? '' : String(values[%s])" % (js(n), js(n), js(n))
        if f['cond']:
            dep, want = f['cond']
            lines.append("        if (String(values[%s]) === %s && !has(%s)) bad.push(%s);"
                         % (js(dep), js(want), expr, js(msg)))
        elif f['required']:
            lines.append("        if (!has(%s)) bad.push(%s);" % (expr, js(msg)))
    # 零售：客户名称是自由文本、客户号是下拉，origin 的 JS 把两者混为一谈（只校验 cust_name 却报「客户名称」）
    if side == '零售信贷' and kind_of(side, mod, 'cust_chinese_name'):
        lines.append("        if (!has(values.cust_chinese_name)) bad.push('客户名称');")
    # origin：选「其他」时手填内容必填，文案与控件标签不同（「补充说明」），照抄
    if kind_of(side, mod, 'enterprise_tag_other') is not None:
        lines.append("        if (values.enterprise_tag === '其他' "
                     "&& !has(values.enterprise_tag_other)) bad.push('企业标签（选“其他”时的补充说明）');")
    return '\n'.join(lines)


def submit_params_js(side, mod, contract, which):
    """从数据集声明反推提交参数；身份参数跳过（由 callData 注入）。"""
    ds = contract['datasets'][mod + '_' + which]
    lines = []
    for name, typ, default in ds['params']:
        if typ == 'formula' or name in IDENTITY_PARAMS:
            continue
        if name == 'p_id':
            continue                        # 非新增时由上层 unshift 补
        w = widget_of(name)
        if w == 'business_type' or name == 'p_business_type':
            lines.append("                { name: %s, type: 'String', value: BUSINESS_TYPE },"
                         % js('p_business_type'))
            continue
        if w == 'enterprise_tag':
            # 选「其他」时落库值取右边手填内容
            expr = "(tag === undefined || tag === null) ? '' : String(tag)"
        elif kind_of(side, mod, w) is None:
            # origin 没有这个控件（零售储备项目的电话/企业标签），发空串，与 origin 实际效果一致
            expr = "''"
        else:
            expr = value_expr(side, mod, w, "values[%s]" % js(w))
        lines.append("                { name: %s, type: 'String', value: %s }," % (js(name), expr))
    return '\n'.join(lines)


def form_item_js(side, mod, f_):
    n, label, k = f_['name'], f_['label'], f_['kind']
    rules = []
    if f_['required']:
        rules.append("{ required: true, message: '请输入%s' }" % label)
    # 条件必填（cond）**不能**下静态 rules：antd 的 required 是无条件的，
    # 会在「是否续贷」为否时照样卡住修改。origin 里它们是提交前的 JS 检查
    # （validateFields + Modal.warning），故这里只由 validateFields 负责。
    rule_js = ''
    if rules:
        rule_js = ' rules={[%s]}' % ', '.join(rules)

    if k == 'text':
        ctrl = "React.createElement(Input, { placeholder: '请输入%s', allowClear: true })" % label
    elif k == 'textarea':
        ctrl = "React.createElement(Input.TextArea, { rows: 3, placeholder: '请输入%s' })" % label
    elif k == 'number':
        ctrl = ("React.createElement(InputNumber, { style: { width: '100%%' }, "
                "placeholder: '请输入%s', controls: false })" % label)
    elif k == 'date':
        # 这两支没有走 % 格式化，所以是单个 % —— 写成 %%（像 number/pick 那几支）会原样输出成无效 CSS
        ctrl = "React.createElement(DatePicker, { style: { width: '100%' }, format: 'YYYY-MM-DD' })"
    elif k == 'datetime':
        ctrl = ("React.createElement(DatePicker, { style: { width: '100%' }, showTime: true, "
                "format: 'YYYY-MM-DD HH:mm:ss' })")
    elif k == 'pick':
        # processing_status 的选项不在 FIELDS 里，按模块的办理状态字典填（origin 每页各不相同）
        opts = f_['options'] or [(x, x) for x in G.FORM_STATUS[mod]]
        ctrl = ("React.createElement(Select, { placeholder: '请选择%s', allowClear: true, options: %s })"
                % (label, js([{'value': v, 'label': t} for v, t in opts])))
    elif k == 'ref':
        ctrl = ("React.createElement(Select, { placeholder: '请选择%s', allowClear: true, showSearch: true, "
                "optionFilterProp: 'label', options: options[%s] || [] })" % (label, js(n)))
    else:
        raise SystemExit('未知 kind: %s/%s/%s' % (side, mod, k))

    span = 24 if not f_['half'] else 12
    col = (
        "                        <Col span={%d}>\n"
        "                            <Form.Item name=%s label=%s%s>\n"
        "                                {%s}\n"
        "                            </Form.Item>\n"
        "                        </Col>" % (span, js(n), js(label), rule_js, ctrl)
    )
    if n == 'enterprise_tag_other':
        # origin 的 add/detail 页是拿 JS 把这个控件连同它的标签一起 setVisible：
        #     var isOther = (pc.getValueByName('enterprise_tag') === '其他');
        #     pc.getWidgetByName('enterprise_tag_other').setVisible(isOther);
        #     pc.getWidgetByName('lab_enterprise_tag_other').setVisible(isOther);
        #     syncOther();   // 编辑场景带入「其他」时默认显示
        # 移植过来就是「tagOther 为假时不渲染」——tagOther 由 Form 的 onValuesChange
        # 维护（选「其他」置真）。不挂 required 规则：antd 只校验已挂载的字段，
        # 而 origin 对它的判定在 validateFields 里（见 validate_js），报的文案也不同。
        return ("                        {tagOther ? (\n" + col +
                "\n                        ) : null}")
    return col


def form_items_js(side, mod, only=None):
    out = []
    for f_ in G.FIELDS[(side, mod)]:
        if only is not None and f_['name'] not in only:
            continue
        out.append(form_item_js(side, mod, f_))
    # 注意：enterprise_tag_other（企业标签选「其他」时的手填框）**不要**在这里再补一份。
    # 它已经在 G.FIELDS 里，循环已经发过一次；早先这里硬补一份，结果整份表单里
    # 出现了两个 id 相同的 Form.Item（实测 add 表单里 #enterprise_tag_other ×2），
    # 而且因为 only=<状态页字段> 的 status 分支也会被补上，连「修改办理状态」弹窗
    # 都多出一个企业标签输入框 —— origin 的 reserve_project_status.cpt 里
    # enterprise_tag_other 是 0 次出现。可见性由 form_item_js 按 tagOther 控制。
    return '\n'.join(out)


# ── 组装 ────────────────────────────────────────────────────────────────────
def build_list(side, mod, contract):
    cfg = G.SIDES[side]
    meta = G.MODULE_META[mod]
    gated = bool(cfg['forbidden'] and meta['gated'])
    has_batch = gated                     # origin：批量删除与禁业开关同在三模块
    row_delete = (not gated) and (mod == 'non_profit_conversion' or side == '零售信贷')
    body = T.LIST_TPL
    body = body.replace('@@RUNTIME@@', T.RUNTIME)
    body = body.replace('@@LIST_PARAMS@@', params_js(side, mod, 'list', LIST_VALUE, '            '))
    body = body.replace('@@COUNT_PARAMS@@', params_js(side, mod, 'count', LIST_VALUE, '            '))
    body = body.replace('@@M@@', mod)
    body = body.replace('@@TITLE@@', meta['title'])
    body = body.replace('@@NOUN@@', meta['noun'])
    body = body.replace('@@CAN_TOGGLE@@', 'true' if (cfg['forbidden'] and meta['config_key']) else 'false')
    body = body.replace('@@CONFIG_KEY@@', js(meta['config_key']) if meta['config_key'] else 'null')
    body = body.replace('@@GATED@@', 'true' if gated else 'false')
    body = body.replace('@@HAS_BATCH@@', 'true' if has_batch else 'false')
    body = body.replace('@@ROW_DELETE@@', (
        "btns.push(React.createElement(Button, {\n"
        "                    key: 'x', size: 'small', type: 'link', danger: true,\n"
        "                    onClick: function() { handleRowDelete(r); }\n"
        "                }, '删除'));") if row_delete else '')
    body = body.replace('@@COLS@@', list_cols_js(side, mod))
    body = body.replace('@@EXPORT_COLS@@', export_cols_js(side, mod))
    body = body.replace('@@STATUS_OPTS@@', status_opts_js(G.LIST_STATUS[mod]))
    body = body.replace('@@DATE_FILTER@@', (
        "(<React.Fragment>\n"
        "                            <span>到期日:</span>\n"
        "                            <DatePicker value={startDate} onChange={setStartDate} placeholder=\"起始\" />\n"
        "                            <span>至</span>\n"
        "                            <DatePicker value={endDate} onChange={setEndDate} placeholder=\"截止\" />\n"
        "                        </React.Fragment>)") if meta['date_filter'] else 'null')
    body = body.replace('@@BATCH_BTN@@', (
        "<Button danger icon={icon('/outlined/delete.svg')} onClick={handleBatchDelete}>批量删除</Button>"
    ) if has_batch else '')
    # origin 表头第 2 行（只有普惠三模块有）：="当前变更状态为：" + IF($forbidden_flag = 0, "允许变更", "禁止变更")
    body = body.replace('@@STATUS_LINE@@', (
        "<div style={{ color: '#888', marginBottom: 4 }}>当前变更状态为："
        "{forbidden === '1' ? '禁止变更' : '允许变更'}</div>"
    ) if (cfg['forbidden'] and meta['config_key']) else '')
    # origin 的可见开关按钮文案固定为「禁止变更」，当前状态由上面那行文字表示
    body = body.replace('@@TOGGLE_BTN@@', (
        "<Button icon={icon('/outlined/setting.svg')} onClick={handleToggleForbidden}>禁止变更</Button>"
    ) if (cfg['forbidden'] and meta['config_key']) else '')
    body = body.replace('@@ACT_W@@', '150' if row_delete else '120')
    body = body.replace('@@SCROLL_X@@', str(scroll_x(mod)))
    return inject_globals(body, side)


def build_form(side, mod, contract):
    cfg = G.SIDES[side]
    meta = G.MODULE_META[mod]
    body = T.FORM_TPL
    body = body.replace('@@RUNTIME@@', T.RUNTIME)
    body = body.replace('@@M@@', mod)
    body = body.replace('@@TITLE@@', meta['title'])
    body = body.replace('@@NOUN@@', meta['noun'])
    body = body.replace('@@STATUS_OPTS@@', status_opts_js(G.FORM_STATUS[mod]))
    body = body.replace('@@DEFAULTS@@', defaults_js(side, mod))
    body = body.replace('@@LOAD_MAP@@', load_map_js(side, mod))
    body = body.replace('@@LOAD_OPTIONS@@', load_options_js(side, mod))
    body = body.replace('@@DEP_META@@', dep_meta_js(side, mod))
    body = body.replace('@@DEP_TRIGGER@@', dep_trigger_js(side, mod))
    body = body.replace('@@VALIDATE@@', validate_js(side, mod))
    body = body.replace('@@FORM_ITEMS@@', form_items_js(side, mod))
    # 状态变更弹窗只渲染这两个字段 —— origin 的 <模块>_status.cpt 里就只有
    # 一个 status 下拉（默认值 =$processing_status，即该行当前状态）和
    # 一个 processing_status_date 日期时间控件。
    # 这不是「少渲染点更好看」的问题：antd 的 validateFields() 会校验所有**已挂载**字段，
    # 状态弹窗不回填其他字段，若照旧全渲染，必填校验会一直拦着，
    # 表现就是点「确定」毫无反应（连 /api/data 都不会发）。
    body = body.replace('@@STATUS_ITEMS@@',
                        form_items_js(side, mod, only=STATUS_FORM_FIELDS))
    body = body.replace('@@SUBMIT_PARAMS@@', submit_params_js(side, mod, contract, 'insert'))
    body = body.replace('@@DELETE_PARAMS@@',
                        params_js(side, mod, 'delete', DELETE_VALUE, '                '))
    body = body.replace('@@STATUS_PARAMS@@',
                        params_js(side, mod, 'status', FORM_VALUE, '                    '))
    return inject_globals(body, side)


def inject_globals(body, side):
    cfg = G.SIDES[side]
    for k, v in [('@@PAGES_DIR@@', cfg['pages_dir']),
                 ('@@DATA_CPT@@', cfg['data_cpt']),
                 ('@@ADMIN_ROLE@@', cfg['admin_role']),
                 ('@@BUSINESS_TYPE@@', cfg['business_type'])]:
        body = body.replace(k, v)
    return body


def main():
    out_root = G.OUT_ROOT
    made = []
    for side in G.SIDES:
        contract = load_contract(side)
        d = os.path.join(out_root, SIDE_DIR[side])
        os.makedirs(d, exist_ok=True)
        for mod in MODS:
            for kind, builder in (('list', build_list), ('form', build_form)):
                src = builder(side, mod, contract)
                path = os.path.join(d, '%s_%s.jsx' % (mod, kind))
                with open(path, 'w', encoding='utf-8', newline='\n') as fh:
                    fh.write(src)
                made.append((path, len(src.encode('utf-8'))))
    for p, n in made:
        print('%8d  %s' % (n, os.path.relpath(p, out_root)))
    print('\n共 %d 个文件' % len(made))


if __name__ == '__main__':
    main()
