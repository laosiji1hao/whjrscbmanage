# -*- coding: utf-8 -*-
"""16 个壳页面的 JS 模板。占位符用 @@NAME@@，由 gen_pages_run.py 替换。

这些模板拼出来的文件是 **完整自包含** 的：
display_writer.py 会把整段 <Content> 换成编译后的 mjs，
骨架里的 PATH / hideStyle / appRoot 都不会被注入，缺一个页面就白屏。

两条硬约束（踩过坑，勿动）：
  1. useState 解构必须写 `const [a, b] = React.useState(...)` ——
     display_writer 的转换正则只认 const，且初始化表达式里不能出现 `);`。
  2. origin 的值里出现的杂散 `A` 后缀、多余括号等缺陷，按**原文本意**实现，
     并在 docs/需求确认书.md 里逐条记录。
"""

# ── 公共运行时（两侧、两页型逐字共用）──────────────────────────────────────
RUNTIME = r'''
var PATH = {
    currentDir: (function() {
        var name = FR.remoteEvaluate("=reportName");
        return name ? name.substring(0, name.lastIndexOf('/') + 1) : '@@PAGES_DIR@@';
    })(),
    // servletURL 在决策平台菜单里取不到（ReferenceError），必须守卫；
    // 兜底写死本侧项目路径。勿改回无守卫的裸写法。
    apiBase: (function() {
        var su = null;
        try { su = servletURL; } catch (e) {}
        if (!su) { try { su = FR.remoteEvaluate("=servletURL"); } catch (e2) {} }
        if (!su) return "/webroot/decision";
        var parts = su.split("/");
        return '/' + parts[1] + '/' + parts[2];
    })(),
    getDataTemplate: function(filename) {
        return this.currentDir.replace('/pages/', '/data/') + filename;
    },
    getTemplatePath: function(filename) {
        return this.currentDir + filename;
    }
};

var hideStyle = document.createElement('style');
hideStyle.innerHTML =
    '.fr-report{position:absolute!important;left:-9999px!important;visibility:hidden!important}' +
    '.content-container,.fr-content,.reportPane{height:0!important;overflow:hidden!important;pointer-events:none!important}' +
    'body>.textbox-container,body>#textboxContainer,body>.widget-container{display:none!important}';
document.head.appendChild(hideStyle);
document.body.setAttribute('style',
    'margin:0;padding:0;min-height:100vh;box-sizing:border-box;overflow-y:auto;');

/* ===== DEVELOPER ZONE ===== */

var appRoot = document.createElement('div');
appRoot.id = 'app-root';
document.body.insertBefore(appRoot, document.body.firstChild);

var DATA_CPT = '@@DATA_CPT@@';
var ADMIN_ROLE = '@@ADMIN_ROLE@@';
var BUSINESS_TYPE = '@@BUSINESS_TYPE@@';

var zhCN = {
    locale: 'zh-cn',
    Pagination: { items_per_page: '条/页', jump_to: '跳至', jump_to_confirm: '确定', page: '页',
        prev_page: '上一页', next_page: '下一页', prev_5: '向前 5 页', next_5: '向后 5 页',
        prev_3: '向前 3 页', next_3: '向后 3 页', page_size: '页码' },
    Table: { filterTitle: '筛选', filterConfirm: '确定', filterReset: '重置', selectAll: '全选',
        selectInvert: '反选', sortTitle: '排序', expand: '展开行', collapse: '折叠行', emptyText: '暂无数据' },
    Modal: { okText: '确定', cancelText: '取消', justOkText: '知道了' },
    Popconfirm: { okText: '确定', cancelText: '取消' },
    Form: { optional: '（可选）', defaultValidateMessages: {
        default: '字段验证错误 ${label}', required: '请输入 ${label}',
        enum: '${label} 必须是其中一个', whitespace: '不能输入空格' } },
    Empty: { description: '暂无数据' },
    DatePicker: { placeholder: '请选择日期', rangePlaceholder: ['开始日期', '结束日期'] },
    Select: { placeholder: '请选择' }
};

// 图标：从 help/lib/antd/icons/ 同步加载并缓存，内联渲染
var iconBase = PATH.apiBase.replace('/decision', '/help/lib/antd/icons');
var iconCache = {};
(function() {
    var names = ['search', 'plus', 'reload', 'edit', 'delete', 'close', 'check', 'filter',
                 'export', 'download', 'setting', 'user'];
    names.forEach(function(name) {
        $.ajax({
            url: iconBase + '/outlined/' + name + '.svg',
            type: 'GET', async: false, dataType: 'text',
            success: function(svg) { iconCache[name] = svg; },
            error: function() { iconCache[name] = null; }
        });
    });
})();

function icon(name) {
    var key = name.replace('/outlined/', '').replace('.svg', '');
    var svg = iconCache[key];
    if (!svg) return null;
    svg = svg.replace('<svg ', '<svg fill="currentColor" width="1em" height="1em" ');
    return React.createElement('span', {
        style: { display: 'inline-flex', alignItems: 'center', lineHeight: 1 },
        dangerouslySetInnerHTML: { __html: svg }
    });
}

// 数据集里是文本替换 IN ('${x}')，所以 x 必须是  a','b','c 这个形态。
// 每个值单独转义（\ → \\、' → ''），分隔符本身的单引号不转义 —— 它就是 SQL 的引号。
// 千万不要对拼好的整串再转义一次，那会把分隔符一起毁掉。
function sqlList(arr) {
    return (arr || []).filter(function(v) {
        return v !== undefined && v !== null && v !== '';
    }).map(function(v) {
        return String(v).replace(/\\/g, '\\\\').replace(/'/g, "''");
    }).join("','");
}
// 反向：把数据集返回的 a','b 形态拆回数组（sys_branch_no_list 是这种）
function splitList(s) {
    if (s === undefined || s === null || s === '') return [];
    return String(s).split("','");
}

// 机构范围（非分行管理员按此收紧到可见机构，分行管理员不收紧）。
// 用**同步变量**而非 React state：listParams 在 reload 的同一拍就要读取，
// state 更新是异步的，初载「先 setBranchNoList 再 reload」会读到旧的空串，
// 列表 SQL 得到 AND branch_no IN ('') 而永远空列表。该变量不参与渲染。
var scopeBranch = '';

// ── 身份 ─────────────────────────────────────────────────────────────────
// /api/data **不采用任何参数默认值**：公式型（=$fine_username）和普通串默认值都不采用，
// 数据集参数只有请求里显式带进来的才有值。所以身份必须页面自己取、自己发。
//   =$fine_username → "admin"（串）
//   =$fine_role     → ["superusers"]（**数组**，join(',') 后当普通串发）
// 这三个值任何数据集都可能用（写入行的 created_by/updated_by、机构范围、
// 禁业开关的角色判定、零售的客户下拉），所以 callData 里无条件注入 ——
// 数据集没声明这些参数时帆软也不报错（实测），逐个判断声明反而更容易漏。
var IDENTITY = (function() {
    var out = { user: '', role: '' };
    function text(v) {
        if (v === null || v === undefined) return '';
        if (Object.prototype.toString.call(v) === '[object Array]') return v.join(',');
        return String(v);
    }
    function take(key, expr) {
        var v;
        try { v = FR.remoteEvaluate(expr); } catch (e) { return; }
        // remoteEvaluate 正常是同步的（PATH.currentDir 就靠这一点）。万一回的是
        // thenable，先留空、resolve 后再补 —— 绝不能把 '[object Promise]'
        // 当用户名写进 created_by。
        if (v && typeof v.then === 'function') {
            v.then(function(r) { out[key] = text(r); }, function() {});
            return;
        }
        out[key] = text(v);
    }
    take('user', '=$fine_username');
    take('role', '=$fine_role');
    return out;
})();

function identityParams() {
    return [
        { name: 'p_operator', type: 'String', value: IDENTITY.user },
        { name: 'fine_role', type: 'String', value: IDENTITY.role },
        { name: 'user_name', type: 'String', value: IDENTITY.user }
    ];
}

// 统一的 /api/data 调用：业务参数 + 身份参数（见上）。
function callData(dsName, params, onOk, onErr) {
    $.ajax({
        url: PATH.apiBase + '/api/data',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            report_path: PATH.getDataTemplate(DATA_CPT),
            datasource_name: dsName,
            page_number: -1,
            page_size: -1,
            parameters: (params || []).concat(identityParams())
        }),
        success: function(res) {
            if (typeof res === 'string') { try { res = JSON.parse(res); } catch (e) {} }
            if (!res || res.err_code !== 0) {
                antd.message.error((res && res.err_msg) || '操作失败');
                if (onErr) onErr(res);
                return;
            }
            if (onOk) onOk(res.data || []);
        },
        error: function(xhr, status, error) {
            antd.message.error('网络错误：' + error);
            if (onErr) onErr(null);
        }
    });
}

// 存储过程统一 SELECT JSON_OBJECT(...) AS result，/api/data 回来是一行 {result: "{...}"}
function spOk(rows) {
    if (!rows || !rows.length) return true;
    var v = rows[0].result !== undefined ? rows[0].result : rows[0];
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { return true; } }
    if (v && typeof v === 'object' && v.success === false) {
        antd.message.error(v.message || '操作失败');
        return false;
    }
    if (v && typeof v === 'object' && v.message) { antd.message.success(v.message); }
    return true;
}

// tinyint / 'true' / true 一律显示成 是/否
function yn(v) {
    if (v === undefined || v === null || v === '') return '';
    var s = String(v).toLowerCase();
    if (s === '1' || s === 'true') return '是';
    if (s === '0' || s === 'false') return '否';
    return String(v);
}
function isTrue(v) { return yn(v) === '是'; }

// 日期：库里可能是 '2026-01-15'、'2026-01-15 00:00:00' 或时间戳
function toDay(v) {
    if (v === undefined || v === null || v === '') return null;
    var d = dayjs(v);
    return d.isValid() ? d : null;
}
function fmtDate(v, withTime) {
    var d = toDay(v);
    if (!d) return '';
    return d.format(withTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD');
}
function fmtCell(v, render) {
    if (v === undefined || v === null || v === '') return '';
    if (render === 'yn') return yn(v);
    if (render === 'dt') return fmtDate(v, true);
    return String(v);
}

// 客户端导出：origin 是 pagecut.output_excel() / window.open(REPORT_URL)，
// 加壳后统一改成取全量再本地生成 CSV（带 BOM，Excel 直接打开不乱码）。
function downloadCsv(filename, headers, rows) {
    var q = function(v) {
        var s = (v === undefined || v === null) ? '' : String(v);
        return '"' + s.replace(/"/g, '""') + '"';
    };
    var lines = [headers.map(q).join(',')];
    rows.forEach(function(r) { lines.push(r.map(q).join(',')); });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}
'''


# ── 列表页 ──────────────────────────────────────────────────────────────────
LIST_TPL = r'''@@RUNTIME@@

function App() {
    var { Table, Button, Input, Select, Space, Modal, DatePicker, Checkbox } = antd;

    const [data, setData] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [total, setTotal] = React.useState(0);
    const [current, setCurrent] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(20);
    const [selectedKeys, setSelectedKeys] = React.useState([]);

    // 筛选条件（与 origin 参数面板控件一一对应）
    const [status, setStatus] = React.useState([]);
    const [branchLay2, setBranchLay2] = React.useState([]);
    const [startDate, setStartDate] = React.useState(null);
    const [endDate, setEndDate] = React.useState(null);

    // 字典 / 配置
    const [branchOptions, setBranchOptions] = React.useState([]);
    const [myRole, setMyRole] = React.useState('');
    const [forbidden, setForbidden] = React.useState('0');

    const [modal, setModal] = React.useState({ open: false, url: '', title: '', width: 900 });

    var CAN_TOGGLE = @@CAN_TOGGLE@@;      // 本页有没有「禁业开关」
    var CONFIG_KEY = @@CONFIG_KEY@@;      // mgmt_config 里的键名；无开关时为 null
    var GATED = @@GATED@@;                // 新增/详情/状态是否受禁业开关约束

    // origin：forbidden_flag == "1" 时，新增/查看详情/修改状态/批量删除 都提示无权限
    function blocked() {
        if (!GATED || forbidden !== '1') return false;
        antd.message.warning('您没有权限使用该功能');
        return true;
    }

    function listParams(page, size) {
        return [
@@LIST_PARAMS@@
        ];
    }

    function fetchList(page, size) {
        setLoading(true);
        callData('@@M@@_list', listParams(page, size), function(rows) {
            setData(rows);
            setLoading(false);
        }, function() { setLoading(false); });
    }

    // _count 数据集没有 pp_pageno 参数，不能直接复用 listParams
    function countParams(size) {
        return [
@@COUNT_PARAMS@@
        ];
    }

    function fetchTotal() {
        callData('@@M@@_count', countParams(pageSize), function(rows) {
            if (rows && rows.length) setTotal(parseInt(rows[0].totalcnt, 10) || 0);
            else setTotal(0);
        }, null);
    }

    function reload(page, size) {
        fetchList(page || current, size || pageSize);
        fetchTotal();
    }

    // 初始化：先取字典与配置，再查列表
    React.useEffect(function() {
        callData('dict_branch_lay2', [], function(rows) {
            setBranchOptions(rows.map(function(r) {
                return { value: r.branch_list, label: r.branch_nm };
            }));
        }, null);
        callData('sys_branch_no_list', [], function(rows) {
            if (rows && rows.length) scopeBranch = rows[0].branch_no_list || '';
            // 机构范围必须先于列表查询确定：列表 SQL 对「非分行管理员」会按
            // branch_no_list 收紧到该用户机构，查得太早它还是空串，
            // 会得到 AND branch_no IN ('') → 永远空列表。所以初始 reload 挪到这里，
            // 等 sys_branch_no_list 回来后再发（服务端无 whfr_user 行时 failing-closed）。
            reload(1, pageSize);
        }, function() {
            reload(1, pageSize);  // 机构取不到也不能把页面钉死在空表格上
        });
        callData('sys_user_role', [], function(rows) {
            if (rows && rows.length) setMyRole(rows[0].fine_role || '');
        }, null);
        if (CONFIG_KEY) {
            callData('sys_mgmt_config', [], function(rows) {
                var hit = null;
                (rows || []).forEach(function(r) {
                    if (r.config_key === CONFIG_KEY) hit = r;
                });
                // 配置缺失按「允许变更」处理，与 origin 取不到值时不拦的行为一致
                setForbidden(hit && String(hit.config_value) === '1' ? '1' : '0');
            }, null);
        }
    }, []);

    function handleSearch() { setCurrent(1); reload(1, pageSize); }
    function handleReset() {
        setStatus([]); setBranchLay2([]); setStartDate(null); setEndDate(null);
        setSelectedKeys([]); setCurrent(1);
        // setState 是异步的，重置后下一拍再查
        setTimeout(function() { reload(1, pageSize); }, 0);
    }
    function handlePageChange(page, size) {
        setCurrent(page); setPageSize(size);
        reload(page, size);
    }

    // 新增 / 详情 / 状态 / 删除（统一走 iframe 弹窗）
    // 参数一律用 & 拼在 viewlet 之后 —— 写成 viewlet=xxx.cpt?mode=add 会把 ?mode=add
    // 当成路径的一部分，帆软直接报 Unresolvable Operation:write
    function openForm(mode, record, extra) {
        if (blocked()) return;
        var q = '&mode=' + mode;
        if (record && record.id !== undefined) q += '&id=' + encodeURIComponent(record.id);
        if (extra) {
            Object.keys(extra).forEach(function(k) {
                q += '&' + k + '=' + encodeURIComponent(extra[k]);
            });
        }
        var titles = { add: '新增@@NOUN@@', detail: '@@NOUN@@详情',
                       status: '修改办理状态', delete: '警告' };
        var widths = { add: 900, detail: 900, status: 420, delete: 420 };
        setModal({
            open: true,
            url: PATH.apiBase + '/view/report?op=write&viewlet=' +
                 PATH.getTemplatePath('@@M@@_form.cpt') + q,
            title: titles[mode],
            width: widths[mode]
        });
    }

    // 批量删除：origin 是「删除（全选）」勾选框 + 「批量删除」按钮 + UpdateConfig 写 is_deleted
    function handleBatchDelete() {
        if (blocked()) return;
        if (!selectedKeys.length) { antd.message.warning('请先勾选要删除的记录'); return; }
        Modal.confirm({
            title: '警告',
            content: '确认要删除选中的 ' + selectedKeys.length + ' 条记录吗！',
            okText: '确定', cancelText: '取消', okButtonProps: { danger: true },
            onOk: function() {
                var left = selectedKeys.slice();
                var failed = 0;
                var step = function() {
                    if (!left.length) {
                        if (!failed) antd.message.success('删除成功');
                        setSelectedKeys([]);
                        reload(1, pageSize);
                        return;
                    }
                    var id = left.shift();
                    callData('@@M@@_delete', [
                        { name: 'p_id', type: 'String', value: String(id) },
                        { name: 'p_business_type', type: 'String', value: BUSINESS_TYPE }
                    ], function(rows) {
                        if (!spOk(rows)) failed++;
                        step();
                    }, function() { failed++; step(); });
                };
                step();
            }
        });
    }

    // 行内删除：origin 弹 <模块>_delete.cpt，标题「警告」，正文由 msg 参数传入
    function handleRowDelete(record) {
        openForm('delete', record, { msg: record.cust_name || record.customer_name || '' });
    }

    // 禁业开关：origin 是 role 判定 + 两句不同的 confirm + 两个隐藏按钮写 mgmt_config
    function handleToggleForbidden() {
        if (myRole.indexOf(ADMIN_ROLE) === -1) {
            antd.message.warning('您没有权限使用该功能');
            return;
        }
        var next = forbidden === '1' ? '0' : '1';
        Modal.confirm({
            title: '提示',
            content: forbidden === '0' ? '当前状态为允许变更，确认禁止变更？'
                                       : '当前状态为禁止变更，确认开启变更？',
            okText: '确定', cancelText: '取消',
            onOk: function() {
                callData('mgmt_forbidden_set', [
                    { name: 'p_config_key', type: 'String', value: CONFIG_KEY },
                    { name: 'p_config_value', type: 'String', value: next }
                ], function(rows) {
                    if (spOk(rows)) { setForbidden(next); reload(1, pageSize); }
                }, null);
            }
        });
    }

    // 导出：origin 是 pagecut.output_excel() / window.open(REPORT_URL)，
    // 这里取全量（pp_pageno=1 / pp_pagesize=100000）后本地生成 CSV
    function handleExport() {
        setLoading(true);
        callData('@@M@@_list', listParams(1, 100000), function(rows) {
            setLoading(false);
            if (!rows || !rows.length) { antd.message.warning('没有可导出的数据'); return; }
            var cols = @@EXPORT_COLS@@;
            var headers = cols.map(function(c) { return c.title; });
            var body = rows.map(function(r) {
                return cols.map(function(c) { return fmtCell(r[c.key], c.render); });
            });
            downloadCsv('@@TITLE@@_' + dayjs().format('YYYYMMDDHHmmss') + '.csv', headers, body);
        }, function() { setLoading(false); });
    }

    // iframe 弹窗通信
    React.useEffect(function() {
        function handler(e) {
            var d = e.data;
            if (!d) return;
            if (d.type === 'fr_form_saved') {
                setModal({ open: false, url: '', title: '', width: 900 });
                reload(1, pageSize);
            }
            if (d.type === 'fr_iframe_resize') {
                var f = document.getElementById('modalFrame');
                if (f) f.style.height = Math.max(200, Math.min(d.height + 20, 640)) + 'px';
            }
        }
        window.addEventListener('message', handler);
        return function() { window.removeEventListener('message', handler); };
    }, [pageSize, forbidden]);

    var columns = [];
    if (@@HAS_BATCH@@) {
        columns.push({
            title: React.createElement(Checkbox, {
                checked: data.length > 0 && selectedKeys.length === data.length,
                indeterminate: selectedKeys.length > 0 && selectedKeys.length < data.length,
                onChange: function(e) {
                    setSelectedKeys(e.target.checked ? data.map(function(r) { return r.id; }) : []);
                }
            }),
            key: '__sel', width: 46, fixed: 'left',
            render: function(_, r) {
                return React.createElement(Checkbox, {
                    checked: selectedKeys.indexOf(r.id) !== -1,
                    onChange: function(e) {
                        setSelectedKeys(function(prev) {
                            if (e.target.checked) return prev.concat([r.id]);
                            return prev.filter(function(x) { return x !== r.id; });
                        });
                    }
                });
            }
        });
    }
    columns.push({ title: '序号', key: '__idx', width: 60, fixed: 'left',
        render: function(_, __, i) { return (current - 1) * pageSize + i + 1; } });
    columns.push({
        title: '操作', key: '__act', width: @@ACT_W@@, fixed: 'left',
        render: function(_, r) {
            var btns = [
                React.createElement(Button, {
                    key: 'd', size: 'small', type: 'link',
                    onClick: function() { openForm('detail', r); }
                }, '查看详情'),
                React.createElement(Button, {
                    key: 's', size: 'small', type: 'link',
                    onClick: function() { openForm('status', r, { status: r.processing_status }); }
                }, '修改状态')
            ];
            @@ROW_DELETE@@
            return React.createElement(Space, { size: 0 }, btns);
        }
    });
@@COLS@@

    return (
        <div style={{ padding: '16px', background: '#f5f5f5', minHeight: '100vh' }}>
            <div style={{ background: '#fff', padding: '16px 24px', borderRadius: '8px' }}>
                <h2 style={{ margin: '0 0 4px' }}>@@TITLE@@</h2>
                @@STATUS_LINE@@
                <div style={{ color: '#888', marginBottom: 16 }}>当前查询结果条数为：{total}</div>

                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between',
                              flexWrap: 'wrap', gap: 12 }}>
                    <Space wrap>
                        <span>状态:</span>
                        <Select mode="multiple" placeholder="全部" style={{ minWidth: 220 }}
                            allowClear value={status}
                            onChange={function(v) { setStatus(v || []); }}
                            options={@@STATUS_OPTS@@} />
                        <span>机构:</span>
                        <Select mode="multiple" placeholder="全部" style={{ minWidth: 240 }}
                            allowClear value={branchLay2}
                            onChange={function(v) { setBranchLay2(v || []); }}
                            options={branchOptions} />
                        {@@DATE_FILTER@@}
                        <Button type="primary" icon={icon('/outlined/search.svg')}
                            onClick={handleSearch}>查询</Button>
                        <Button icon={icon('/outlined/reload.svg')}
                            onClick={handleReset}>重置</Button>
                    </Space>
                    <Space>
                        <Button icon={icon('/outlined/export.svg')}
                            onClick={handleExport}>导出</Button>
                        @@TOGGLE_BTN@@
                        @@BATCH_BTN@@
                        <Button type="primary" icon={icon('/outlined/plus.svg')}
                            onClick={function() { openForm('add', null); }}>新增@@NOUN@@</Button>
                    </Space>
                </div>

                <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
                    size="middle" scroll={{ x: @@SCROLL_X@@, y: 'calc(100vh - 320px)' }}
                    pagination={{
                        current: current, pageSize: pageSize, total: total,
                        showSizeChanger: true, showQuickJumper: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        showTotal: function(t) { return '共 ' + t + ' 条'; },
                        onChange: handlePageChange
                    }} />

                {modal.open && (
                    <Modal title={modal.title} open={true} footer={null} width={modal.width}
                        destroyOnClose
                        onCancel={function() {
                            setModal({ open: false, url: '', title: '', width: 900 });
                        }}
                        styles={{ body: { padding: 0 } }}>
                        <iframe id="modalFrame" src={modal.url}
                            style={{ width: '100%', height: '520px', minHeight: '200px',
                                     maxHeight: '640px', border: 'none' }} />
                    </Modal>
                )}
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('app-root')).render(
    React.createElement(antd.ConfigProvider, { locale: zhCN },
        React.createElement(App)
    )
);
'''


# ── 表单页（新增 / 详情改写 / 状态变更 / 删除，四态合一）────────────────────
FORM_TPL = r'''@@RUNTIME@@

// 页面模式由父窗口用 URL 参数决定：
//   mode=add     新增                              → <模块>_insert
//   mode=detail  查看详情（origin 的 detail 页本身就是可改的「修改」表单）→ <模块>_update
//   mode=status  修改办理状态（origin 的 status 弹窗）→ <模块>_status
//   mode=delete  删除确认（origin 的 delete 弹窗）    → <模块>_delete
function App() {
    var { Form, Input, InputNumber, Select, Button, Space, Row, Col, Spin, Modal, DatePicker } = antd;
    const [form] = Form.useForm();
    const [mode, setMode] = React.useState('add');
    const [saving, setSaving] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [recordId, setRecordId] = React.useState(null);
    const [options, setOptions] = React.useState({});
    const [tagOther, setTagOther] = React.useState(false);
    const [floatGap, setFloatGap] = React.useState(0);

    // ── 给平台的悬浮球让位 ──────────────────────────────────────────────
    // 平台装了「数据预警」插件（plugins/plugin-com.fr.plugin.data.sentinel.v11）时，
    // 每个报表页文档都会被注入一个 40×40 的悬浮球：
    //   position:fixed; right:24px; bottom:48px; z-index:10001（可拖拽，是它配预警的入口）
    // 表单是在列表页的弹窗 iframe 里打开的，而父页把 iframe 高度设成「内容高度 + 20」
    // （见 page_tpl.py LIST_TPL 的 fr_iframe_resize），于是 iframe 的右下角 ≈ 表单底部，
    // 悬浮球正好压在「确定」按钮上 —— 实测在按钮中心做 elementFromPoint，命中的是
    // .sentinel-ant-float-btn-content，也就是**真用户点不到确定**，表单根本提交不了。
    // 它是平台运维入口，既不能藏也不能挪（藏了平台就配不了预警），所以由我方让位：
    // 探测到它就给表单底部留出它占的高度（底 48 + 球 40 + 余量 24 = 112），
    // 没装插件则一点都不留白。
    // 注意：iframe 高度被父页 clamp 到 640，内容超过时表单内部滚动，
    // 滚到底时「按钮下沿到 iframe 底」的距离恰好 = 这段 padding，所以 112 就是最坏余量。
    React.useEffect(function() {
        var FLOAT_SEL = 'data-sentinel-button, .sentinel-ant-float-btn';
        function found() {
            if (!document.querySelector(FLOAT_SEL)) return false;
            setFloatGap(112);
            setTimeout(notifyHeight, 50);   // 留白改变了 scrollHeight，得重新报一次高度
            return true;
        }
        if (found()) return;
        var n = 0;
        var t = setInterval(function() {
            if (found() || ++n > 20) clearInterval(t);   // 最多探 6s，没有就算了
        }, 300);
        return function() { clearInterval(t); };
    }, []);

    var DEP_META = @@DEP_META@@;
    var DEP_TRIGGER = @@DEP_TRIGGER@@;

    // origin 的 validateStr：只判 undefined / null / 空串，不 trim
    function has(v) {
        return !(v === undefined || v === null || v === '');
    }

    React.useEffect(function() {
        var q = new URLSearchParams(window.location.search);
        var m = q.get('mode') || 'add';
        var id = q.get('id');
        setMode(m);
        setRecordId(id);

        if (m === 'status') {
            // origin 的 status 弹窗只带 id + 当前状态，不回查库
            var sv = {};
            sv.processing_status = q.get('status') || '';
            sv.processing_status_date = dayjs();
            form.setFieldsValue(sv);
            return;
        }
        if (m === 'delete') return;

        var v = {};
        if (m === 'add') {
@@DEFAULTS@@
            form.setFieldsValue(v);
        } else if (id) {
            setLoading(true);
            callData('@@M@@_get', [
                { name: 'p_id', type: 'Integer', value: parseInt(id, 10) }
            ], function(rows) {
                setLoading(false);
                if (!rows || !rows.length) { antd.message.error('记录不存在'); return; }
                var d = rows[0];
@@LOAD_MAP@@
                form.setFieldsValue(v);
                setTagOther(v.enterprise_tag === '其他');
                setTimeout(notifyHeight, 50);
            }, function() { setLoading(false); });
        }
@@LOAD_OPTIONS@@
        setTimeout(notifyHeight, 50);
    }, []);

    // iframe 高度通知：读 #app-root，不能读 body（骨架给了 min-height:100vh，会无限增长）
    function notifyHeight() {
        try {
            if (window.parent === window) return;
            var el = document.getElementById('app-root');
            var h = el ? el.scrollHeight : document.body.scrollHeight;
            window.parent.postMessage({ type: 'fr_iframe_resize', height: h }, '*');
        } catch (e) {}
    }
    React.useEffect(function() { notifyHeight(); });

    function closeSelf() {
        try {
            if (window.parent !== window) window.parent.postMessage({ type: 'fr_form_saved' }, '*');
        } catch (e) {}
    }

    // 依赖型下拉（账户号依赖客户号、客户号依赖客户名称）重新取数
    function loadDep(name, depValue) {
        var meta = DEP_META[name];
        if (!meta) return;
        if (!depValue) {
            setOptions(function(p) {
                var n = Object.assign({}, p); n[name] = []; return n;
            });
            return;
        }
        callData(meta.ds, [{ name: meta.param, type: 'String', value: depValue }], function(rows) {
            setOptions(function(p) {
                var n = Object.assign({}, p);
                n[name] = rows.map(function(r) {
                    return { value: r[meta.value], label: r[meta.text] };
                });
                return n;
            });
        }, null);
    }

    // 忠实移植 origin 的 fieldArray 必填检查。
    // origin 里 `widget[element]A` / `let fieldArray = []A;` 是两处语法错误，
    // 整段 JS 从未生效过；这里按它的本意实现（去掉杂散的 A），
    // 「是否特别授信业务）」那个多余的右括号照抄。
    function validateFields(values) {
        var bad = [];
@@VALIDATE@@
        return bad;
    }

    function doSubmit(dsName, params) {
        setSaving(true);
        callData(dsName, params, function(rows) {
            setSaving(false);
            if (!spOk(rows)) return;
            setTimeout(closeSelf, 300);
        }, function() { setSaving(false); });
    }

    function handleSubmit() {
        if (mode === 'delete') {
            doSubmit('@@M@@_delete', [
@@DELETE_PARAMS@@
            ]);
            return;
        }
        form.validateFields().then(function(values) {
            if (mode === 'status') {
                doSubmit('@@M@@_status', [
@@STATUS_PARAMS@@
                ]);
                return;
            }
            var bad = validateFields(values);
            if (bad.length) {
                Modal.warning({
                    title: '警告',
                    content: '以下字段不能为空：\n\n' + bad.join('\n'),
                    okText: '知道了'
                });
                return;
            }
            var tag = values.enterprise_tag;
            // origin：企业标签选「其他」时，落库值取右边手填内容（enterprise_tag_other 从不落库）
            if (tag === '其他' && values.enterprise_tag_other) tag = values.enterprise_tag_other;

            var params = [
@@SUBMIT_PARAMS@@
            ];
            if (mode !== 'add') params.unshift({ name: 'p_id', type: 'String', value: String(recordId) });
            doSubmit(mode === 'add' ? '@@M@@_insert' : '@@M@@_update', params);
        }).catch(function() {});
    }

    // 删除确认：origin 的 delete 弹窗标题「警告」，正文来自列表页传入的 msg
    if (mode === 'delete') {
        var msg = '';
        try { msg = new URLSearchParams(window.location.search).get('msg') || ''; } catch (e) {}
        return (
            <div style={{ padding: '20px 24px', paddingBottom: 20 + floatGap }}>
                <div style={{ marginBottom: 20, minHeight: 22 }}>{msg}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button onClick={closeSelf}>取消</Button>
                    <Button type="primary" danger loading={saving} onClick={handleSubmit}>确定</Button>
                </div>
            </div>
        );
    }

    var titleMap = { add: '新增@@NOUN@@', detail: '@@NOUN@@详情', status: '修改办理状态' };
    var okText = mode === 'detail' ? '修改' : '确定';

    return (
        <div style={{ padding: '16px 24px', paddingBottom: 16 + floatGap }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>{titleMap[mode] || ''}</h3>
            <Spin spinning={loading}>
                <Form form={form} layout="vertical" autoComplete="off"
                    onValuesChange={function(changed) {
                        Object.keys(changed).forEach(function(k) {
                            if (DEP_TRIGGER[k]) DEP_TRIGGER[k].forEach(function(nm) { loadDep(nm, changed[k]); });
                            if (k === 'enterprise_tag') setTagOther(changed[k] === '其他');
                        });
                        setTimeout(notifyHeight, 50);
                    }}>
                    <Row gutter={16}>
                        {mode === 'status' ? (
                            <React.Fragment>
@@STATUS_ITEMS@@
                            </React.Fragment>
                        ) : (
                            <React.Fragment>
@@FORM_ITEMS@@
                            </React.Fragment>
                        )}
                    </Row>
                    <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <Button onClick={closeSelf}>取消</Button>
                            <Button type="primary" loading={saving} onClick={handleSubmit}>{okText}</Button>
                        </div>
                    </Form.Item>
                </Form>
            </Spin>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('app-root')).render(
    React.createElement(antd.ConfigProvider, { locale: zhCN },
        React.createElement(App)
    )
);
'''
