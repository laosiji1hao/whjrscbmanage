var PATH = {
    currentDir: (function() {
        var name = null;
        try { name = FR.remoteEvaluate("=reportName"); } catch (e) {}
        return name ? name.substring(0, name.lastIndexOf('/') + 1) : 'whjrscbmanage/pages/';
    })(),
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

var DATA_CPT = 'whjrscbmanage_data.cpt';
var CLOUD_FALLBACK = { cloudUrl: 'http://localhost:9058', prjId: 'whjrscbmanage' };

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

// ── 身份（/api/data 不采用任何参数默认值，必须显式传）────────────────────────
var CUR_USER = (function() {
    try { return String(FR.remoteEvaluate('=$fine_username') || ''); } catch (e) { return ''; }
})();
function identityParams() {
    return [
        { name: 'p_operator', type: 'String', value: CUR_USER },
        { name: 'user_name', type: 'String', value: CUR_USER }
    ];
}

// ── 统一的 /api/data 调用（自动带身份参数）──────────────────────────────────
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

// 存储过程统一 SELECT JSON_OBJECT(...) AS result
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

// ── 云平台调用（myFR.callCloud 封装，模板参数缺失时按 CLOUD_FALLBACK 兜底）───
var CLIENT = (function() {
    function text(v) {
        if (v === null || v === undefined) return '';
        return String(v);
    }
    function remote(p) {
        try { return text(FR.remoteEvaluate('=$' + p)); } catch (e) { return ''; }
    }
    function resolve(promise) {
        try {
            var r = remote(promise);
            if (r) return r;
        } catch (e) {}
        if (typeof myFR !== 'undefined' && myFR[promise]) return myFR[promise];
        return CLOUD_FALLBACK[promise];
    }
    function ensureLoaded() {
        if (typeof window.myFR !== 'undefined') return true;
        try {
            var url = PATH.apiBase.replace('/decision', '') + '/js/myFR.js';
            var r = (function() {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, false);
                xhr.send(null);
                return xhr.responseText;
            })();
            if (!r) return false;
            new Function(r)();
            return typeof window.myFR !== 'undefined';
        } catch (e) { return false; }
    }
    var loaded = ensureLoaded();
    return {
        ready: loaded,
        cloudUrl: function() {
            try {
                var v = remote('cloudUrl');
                if (v) return v;
            } catch (e) {}
            if (typeof myFR !== 'undefined' && myFR.cloudUrl) return myFR.cloudUrl;
            return CLOUD_FALLBACK.cloudUrl;
        },
        call: function(code, body, onOk, onErr) {
            if (!ensureLoaded() || typeof window.myFR === 'undefined' || !window.myFR.callCloud) {
                antd.message.warning('云平台服务不可用（myFR 未加载），请检查后重试');
                if (onErr) onErr(null);
                return;
            }
            try {
                // 模板参数缺失/为空时，用本组件解析值补进 myFR，保证 URL 拼接正确
                var cu = this.cloudUrl();
                if (!myFR.cloudUrl) myFR.cloudUrl = cu;
                if (!myFR.prjId) myFR.prjId = CLOUD_FALLBACK.prjId;
                window.myFR.callCloud(String(code), body || {}, function(data) {
                    if (onOk) onOk(data);
                }, function(msg) {
                    if (msg) { try { antd.message.error(String(msg)); } catch (e) {} }
                    if (onErr) onErr(null);
                }, true);
            } catch (e) {
                if (onErr) onErr(null);
            }
        }
    };
})();

// ── 字典（由原 cpt 的内嵌数据字典 + SQL schema 注释 + JS 逻辑重建）──────────
var DICT_YN  = [{v:'0',t:'否'},{v:'1',t:'是'}];
var DICT_IS  = [{v:'0',t:'否'},{v:'1',t:'是'}];
var DICTS = {
    'yn': DICT_YN,
    symbolStandard: [{v:'0',t:'标准化业务'},{v:'1',t:'非标准化业务'}],
    greenTech: [{v:'0',t:'绿色'},{v:'1',t:'科技'},{v:'2',t:'养老'},{v:'3',t:'不涉及'}],
    industry: [{v:'0',t:'货币金融服务'},{v:'1',t:'资本市场服务'},{v:'2',t:'保险业'},{v:'3',t:'其他金融业'}],
    customerType: [{v:'0',t:'一类'},{v:'1',t:'二类'},{v:'2',t:'三类'},{v:'3',t:'四类'}],
    currency: [{v:'人民币',t:'人民币'},{v:'美元',t:'美元'}],
    guaranty: [{v:'信用',t:'信用'},{v:'保证',t:'保证'},{v:'抵押',t:'抵押'},{v:'质押',t:'质押'}],
    fiveLevel: ['正常一档','正常二档','正常三档','关注','次级','可疑','损失'],
    manageLine: [{v:'金融市场部',t:'金融市场部'}],
    dept: [{v:'利率室',t:'利率室'},{v:'同业室',t:'同业室'},{v:'托管室',t:'托管室'}],
    rating: ['AAA+','AAA','AAA-','AA+','AA','AA-','A+','A','A-','BBB+','BBB','BB','B','CCC','CC','C'],
    exercise: [{v:'0',t:'否'},{v:'1',t:'是'}],
    bizType: [{v:'0',t:'国债'},{v:'1',t:'地方债'},{v:'2',t:'金融债'},{v:'3',t:'企业债'},{v:'4',t:'中期票据'},{v:'5',t:'短期融资券'},{v:'6',t:'资产支持证券'},{v:'7',t:'同业存单'},{v:'8',t:'货币市场工具'},{v:'9',t:'非标准化资产'},{v:'10',t:'股权'},{v:'11',t:'基金'},{v:'12',t:'其他'}],
    status: [{v:'0',t:'未完善'},{v:'1',t:'审核中'},{v:'2',t:'审核失败'},{v:'3',t:'生效中'},{v:'4',t:'已过期'},{v:'5',t:'已中止'}],
    ynNot: [{v:'0',t:'不涉及'},{v:'1',t:'是'}]
};
function dictText(dic, v) {
    if (v === undefined || v === null || v === '') return '';
    var s = String(v);
    var arr = dic || [];
    for (var i = 0; i < arr.length; i++) {
        if (String(arr[i].v) === s) return arr[i].t;
    }
    if (typeof arr[0] === 'string') { return s; }
    return s;
}

// antd Select options 归一化（DICTS 数据结构是 {v,t}，antd 要 {value,label}）
function selOpts(arr) {
    if (!arr) return [];
    return arr.map(function(o) {
        if (o && typeof o === 'object' && 'v' in o) {
            return { value: String(o.v), label: (o.t === undefined || o.t === null) ? '' : String(o.t) };
        }
        return o;
    });
}
function statusText(v) { return dictText(DICTS.status, v); }
function ynText(v) {
    if (v === undefined || v === null || v === '') return '';
    var s = String(v).toLowerCase();
    if (s === '1' || s === 'true') return '是';
    if (s === '0' || s === 'false') return '否';
    return String(v);
}
function isTrue(v) { return ynText(v) === '是'; }

// 日期显示
function fmtDate(v) {
    if (v === undefined || v === null || v === '') return '';
    var d = dayjs(v);
    return d.isValid() ? d.format('YYYY-MM-DD') : String(v);
}

// iframe 弹窗：向父页面汇报内容高度 / 提交完成
function notifyHeight() {
    try {
        if (window.parent === window) return;
        var el = document.getElementById('app-root');
        var h = el ? el.scrollHeight : document.body.scrollHeight;
        window.parent.postMessage({ type: 'fr_iframe_resize', height: h }, '*');
    } catch (e) {}
}
function closeSelf() {
    try {
        if (window.parent !== window) window.parent.postMessage({ type: 'fr_form_saved' }, '*');
    } catch (e) {}
}

// 客户端导出 CSV（带 BOM，Excel 直接打开不乱码）
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
/* ===== 还款计划弹窗（原 install_ment）=====
 * URL 参数：bond_code（当前债券编号）、type（0=申报表单写入；1=查看页写入，本组件只回传，处理在父页）
 * 提交：向父页面 postMessage {type:'fr_inst_plan', result, json, bond_code}，然后关闭
 */
function App() {
    var { Button, DatePicker, InputNumber, Table, Space, Popconfirm } = antd;
    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [bondCode, setBondCode] = React.useState('');

    React.useEffect(function() {
        var q = new URLSearchParams(window.location.search);
        var bc = q.get('bond_code') || '';
        setBondCode(bc);
        if (bc) {
            setLoading(true);
            callData('schedule_by_bond', [{ name: 'p_bond_code', type: 'String', value: bc }], function(data) {
                setLoading(false);
                setRows((data || []).map(function(r, i) {
                    return {
                        key: i + '_' + r.id,
                        sort: r.sort,
                        repayment_date: r.repayment_date ? dayjs(String(r.repayment_date).slice(0, 10)) : null,
                        repayment_amount: r.repayment_amount !== undefined && r.repayment_amount !== null ? Number(r.repayment_amount) : null
                    };
                }));
            }, function() { setLoading(false); });
        }
        setTimeout(notifyHeight, 50);
    }, []);

    function append() {
        setRows(function(prev) {
            var maxSort = prev.reduce(function(m, r) { return Math.max(m, Number(r.sort) || 0); }, 0);
            return prev.concat([{ key: 'new_' + prev.length + '_' + Date.now(), sort: maxSort + 1,
                                  repayment_date: null, repayment_amount: null }]);
        });
    }
    function remove(k) { setRows(function(prev) { return prev.filter(function(r) { return r.key !== k; }); }); }

    function submit() {
        var list = rows.filter(function(r) { return r.repayment_date && r.repayment_amount !== null && r.repayment_amount !== undefined && r.repayment_amount !== ''; })
                       .map(function(r) {
                           return {
                               installmentTime: dayjs(r.repayment_date).format('YYYY-MM-DD'),
                               installmentAmount: String(r.repayment_amount)
                           };
                       })
                       .sort(function(a, b) { return a.installmentTime < b.installmentTime ? -1 : 1; });
        if (!list.length) { antd.message.warning('请先填写还款计划明细（还款时间 + 还款金额）'); return; }
        var result = list.map(function(x) { return '还款时间:' + x.installmentTime + ',还款金额:' + x.installmentAmount; }).join(';');
        var json = JSON.stringify(list);
        try {
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'fr_inst_plan', result: result, json: json, bond_code: bondCode }, '*');
            }
        } catch (e) {}
        setTimeout(closeSelf, 200);
    }

    var columns = [
        { title: '还款时间', key: 'd', width: 220,
          render: function(_, r) {
              return React.createElement(DatePicker, {
                  value: r.repayment_date,
                  style: { width: '100%' },
                  onChange: function(v) {
                      setRows(function(prev) { return prev.map(function(x) { return x.key === r.key ? Object.assign({}, x, { repayment_date: v }) : x; }); });
                  }
              });
          } },
        { title: '还款金额', key: 'a', width: 220,
          render: function(_, r) {
              return React.createElement(InputNumber, {
                  value: r.repayment_amount,
                  style: { width: '100%' },
                  min: 0, precision: 2,
                  placeholder: '金额（元）',
                  onChange: function(v) {
                      setRows(function(prev) { return prev.map(function(x) { return x.key === r.key ? Object.assign({}, x, { repayment_amount: v }) : x; }); });
                  }
              });
          } },
        { title: '操作', key: 'op', width: 90,
          render: function(_, r) {
              return React.createElement(Popconfirm, { title: '确认删除该行？', onConfirm: function() { remove(r.key); } },
                  React.createElement(Button, { size: 'small', type: 'link', danger: true }, '删除'));
          } }
    ];

    return (
        <div style={{ padding: '16px 20px', paddingBottom: 20, maxWidth: 640 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>还款计划<span style={{ fontWeight: 'normal', fontSize: 12, color: '#888', marginLeft: 8 }}>债券编号：{bondCode || '（新增申报未生成）'}</span></h3>
            <Table rowKey="key" loading={loading} columns={columns} dataSource={rows} size="small"
                pagination={false} bordered scroll={{ x: 560 }}
                locale={{ emptyText: '暂无还款计划，请点击「新增行」录入' }} />
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button size="small" onClick={append}>新增行</Button>
                <Space>
                    <Button onClick={closeSelf}>关闭</Button>
                    <Button type="primary" onClick={submit}>提交</Button>
                </Space>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('app-root')).render(
    React.createElement(antd.ConfigProvider, { locale: zhCN },
        React.createElement(App)
    )
);
