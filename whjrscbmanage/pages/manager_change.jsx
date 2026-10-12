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
    'body>.textbox-container,body>#textboxContainer,body>.widget-container{display:none!important}' +
    /* 平台注入的 sentinel 告警浮球（Alert 图标、可拖拽，加载时渲染在报表文档上）——本项目不展示 */
    '[data-sentinel-button],[class*="sentinel-ant-float-btn"]{display:none!important;visibility:hidden!important;pointer-events:none!important}';
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
    // antd v5 DatePicker 日历面板中文（月份/星期/操作钮），否则默认英文 August/Sunday
    DatePicker: {
        lang: {
            locale: 'zh-cn',
            monthBeforeYear: false,
            yearFormat: 'YYYY年',
            monthFormat: 'M月',
            dayFormat: 'D',
            cellDateFormat: 'D',
            fieldDateFormat: 'YYYY-MM-DD',
            fieldDateTimeFormat: 'YYYY-MM-DD HH:mm:ss',
            fieldMonthFormat: 'YYYY-MM',
            fieldWeekFormat: 'YYYY-wo',
            fieldQuarterFormat: 'YYYY-[Q]Q',
            fieldYearFormat: 'YYYY',
            years: '年',
            months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
            monthsShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
            monthText: '月份',
            quarterText: '季度',
            today: '今天',
            now: '此刻',
            okText: '确定',
            cancelText: '取消',
            nextYear: '下一年',
            prevYear: '上一年',
            nextMonth: '下月',
            prevMonth: '上月',
            yearToday: '今年',
            weekdays: ['日', '一', '二', '三', '四', '五', '六'],
            weekdaysShort: ['日', '一', '二', '三', '四', '五', '六'],
            weekdaysMin: ['日', '一', '二', '三', '四', '五', '六'],
            firstDayOfWeek: 0
        },
        timePickerLocale: { placeholder: '请选择时间', rangePlaceholder: ['开始时间', '结束时间'] },
        placeholder: '请选择日期',
        rangePlaceholder: ['开始日期', '结束日期']
    },
    Select: { placeholder: '请选择' }
};

// 注册并启用 dayjs 中文 locale（无需 locale 文件；antd DatePicker 星期行/月份读全局 dayjs locale）
try {
    dayjs.locale('zh-cn', {
        months: '一月_二月_三月_四月_五月_六月_七月_八月_九月_十月_十一月_十二月'.split('_'),
        monthsShort: '1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月'.split('_'),
        weekdays: '星期日_星期一_星期二_星期三_星期四_星期五_星期六'.split('_'),
        weekdaysShort: '周日_周一_周二_周三_周四_周五_周六'.split('_'),
        weekdaysMin: '日_一_二_三_四_五_六'.split('_'),
        weekdaysParseExact: true
    }, true);
} catch (e) {}

// 图标：从 help/lib/antd/icons/ 同步加载并缓存，内联渲染
var iconBase = PATH.apiBase.replace('/decision', '/help/lib/antd/icons');
var iconCache = {};
(function() {
    var names = ['search', 'plus', 'reload', 'edit', 'delete', 'close', 'check', 'filter',
                 'export', 'download', 'setting', 'user', 'exclamation-circle'];
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
    industry: [
        { v: '0', t: '金融业' }, { v: '1', t: '房地产业' },
        { v: '2', t: '租赁和商务服务业' }, { v: '3', t: '科学研究和技术服务业' },
        { v: '4', t: '水利、环境和公共设施管理业' }, { v: '5', t: '居民服务、修理和其他服务业' },
        { v: '6', t: '教育、卫生和社会工作' }, { v: '7', t: '文化、体育和娱乐业' },
        { v: '8', t: '公共管理、社会保障和社会组织' }, { v: '9', t: '农、林、牧、渔业' },
        { v: '10', t: '采矿业' }, { v: '11', t: '制造业' },
        { v: '12', t: '电力、热力、燃气及水生产和供应业' }, { v: '13', t: '建筑业' },
        { v: '14', t: '批发和零售业' }, { v: '15', t: '交通运输、仓储和邮政业' },
        { v: '16', t: '住宿和餐饮业' }, { v: '17', t: '信息传输、软件和信息技术服务业' }
    ],
    customerType: [{v:'0',t:'一类'},{v:'1',t:'二类'},{v:'2',t:'三类'},{v:'3',t:'四类'}],
    currency: [{v:'人民币',t:'人民币'},{v:'美元',t:'美元'}],
    guaranty: [{v:'0',t:'信用'},{v:'1',t:'抵押'},{v:'2',t:'质押'},{v:'3',t:'保证'}],
    fiveLevel: ['正常一档','正常二档','正常三档','关注','次级','可疑','损失'],
    manageLine: [{v:'金融市场部',t:'金融市场部'}],
    dept: [{v:'0',t:'同业室'},{v:'1',t:'利率室'},{v:'2',t:'汇率室'},{v:'3',t:'同业营销管理室'},{v:'4',t:'自负盈亏账户'}],
    rating: ['AAA+','AAA','AAA-','AA+','AA','AA-','A+','A','A-','BBB+','BBB','BB','B','CCC','CC','C'],
    exercise: [{v:'0',t:'否'},{v:'1',t:'是'}],
    bizType: [
        { v: '0', t: '非金融企业类债券投资' }, { v: '1', t: '企业资产支持证券' },
        { v: '2', t: '非交易类-产业基金' }, { v: '3', t: '非交易类-城镇化建设基金' },
        { v: '4', t: '非交易类-同业资产收益权' }, { v: '5', t: '交易类-保险债权投资计划' },
        { v: '6', t: '交易类-券商收益权凭证' }, { v: '7', t: '交易类-特定目的载体投资信用债' },
        { v: '8', t: '交易类-债权融资计划' }, { v: '9', t: '金租通' },
        { v: '10', t: '银证投融通' }, { v: '11', t: '债务融资工具(余额包销或持有)' },
        { v: '12', t: '其他' }
    ],
    status: [{v:'0',t:'未完善'},{v:'1',t:'审核中'},{v:'2',t:'审核失败'},{v:'3',t:'生效中'},{v:'4',t:'已过期'},{v:'5',t:'已中止'}],
    ynNot: [{v:'0',t:'不涉及'},{v:'1',t:'是'}]
};
DICTS.bondType = DICTS.symbolStandard; // pool 表格/导出用 bondType 键
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

// ECIF客户号：17 位数字（以 0 开头），手工只填后面的位，失焦自动前补零到 17 位
function padEcif(v) {
    var s = (v === undefined || v === null) ? '' : String(v).trim();
    if (s === '') return '';
    while (s.length < 17) s = '0' + s;
    return s;
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
        // 不用 /"/g 正则字面量：display_writer 的去注释暂存会把含双引号的正则字面量跨段误吞，
        // 导致字符串还原成 _MJS_S…_ 占位。split/join 等价且安全。
        return '"' + s.split('"').join('""') + '"';
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

/* ── 真正的 .xlsx 导出（用平台自带 webroot/js/jszip.min.js 手工拼 OOXML）── */
function xmlEscape(v) {
    // split/join 代替 replace(/&/g 等正则字面量：display_writer 去注释会用含引号的正则字面量跨段误吞（见 downloadCsv 注）
    return String(v)
        .split('&').join('&amp;')
        .split('<').join('&lt;')
        .split('>').join('&gt;')
        .split('"').join('&quot;')
        .split('\n').join('&#10;');
}
function colName(c) { // 0-based → A,B,...,Z,AA,...
    var s = ''; c = c + 1;
    while (c > 0) { var m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); }
    return s;
}
function xlsxCell(r, c, val) {
    var ref = colName(c) + r;
    var s = (val === undefined || val === null) ? '' : String(val);
    if (s !== '' && /^-?\d+(\.\d+)?$/.test(s)) {
        return '<c r="' + ref + '"><v>' + s + '</v></c>';
    }
    return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + xmlEscape(s) + '</t></is></c>';
}
function ensureJSZip(cb, onErr) {
    if (typeof JSZip !== 'undefined') { cb(); return; }
    var s = document.createElement('script');
    s.src = PATH.apiBase.replace('/decision', '') + '/js/jszip.min.js';
    s.onload = function() { cb(); };
    s.onerror = function() { if (onErr) onErr(); };
    document.head.appendChild(s);
}
function downloadXlsx(filename, headers, rows) {
    ensureJSZip(function() {
        var i, j;
        var rowXml = [];
        var hs = [];
        for (j = 0; j < headers.length; j++) hs.push(xlsxCell(1, j, headers[j]));
        rowXml.push('<row r="1">' + hs.join('') + '</row>');
        for (i = 0; i < rows.length; i++) {
            var cs = [];
            for (j = 0; j < rows[i].length; j++) cs.push(xlsxCell(i + 2, j, rows[i][j]));
            rowXml.push('<row r="' + (i + 2) + '">' + cs.join('') + '</row>');
        }
        var sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
            rowXml.join('') + '</sheetData></worksheet>';
        var zip = new JSZip();
        zip.file('[Content_Types].xml',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
            '<Default Extension="xml" ContentType="application/xml"/>' +
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
            '</Types>');
        zip.file('_rels/.rels',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
            '</Relationships>');
        zip.file('xl/workbook.xml',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
            '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>');
        zip.file('xl/_rels/workbook.xml.rels',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
            '</Relationships>');
        zip.file('xl/worksheets/sheet1.xml', sheetXml);
        zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }).then(function(blob) {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url; a.download = filename;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
        });
    }, function() { antd.message.error('Excel 导出库加载失败'); });
}
/* ===== 编辑业务所属客户经理（原 my_business_pc_newmanager ± busimanage）=====
 * URL 参数：id=业务主键；updaterType=1 表示业务管理岗（保存 226008 带上），默认 0
 */
function App() {
    var { Form, Select, Button, Spin, Input } = antd;
    const [form] = Form.useForm();
    const [orgOpts, setOrgOpts] = React.useState([]);
    const [mgrOpts, setMgrOpts] = React.useState([]);
    const [saving, setSaving] = React.useState(false);
    const [businessId, setBusinessId] = React.useState('0');
    const [updaterType, setUpdaterType] = React.useState('0');

    React.useEffect(function() {
        var q = new URLSearchParams(window.location.search);
        setBusinessId(q.get('biz_uuid') || '');
        var ut = q.get('updaterType') || '0';
        setUpdaterType(ut);
        callData('org_options', [], function(rows) {
            setOrgOpts(rows.map(function(r) { return { value: r.dept_name, label: r.dept_name }; }));
        }, null);
        callData('manager_options', [], function(rows) {
            setMgrOpts(rows.map(function(r) { return { value: r.name_with_id, label: r.name_with_id }; }));
        }, null);
        setTimeout(notifyHeight, 50);
    }, []);

    function parseParen(v) {
        if (!v) return '';
        var m = String(v).match(/\(([^)]+)\)/);
        return m ? m[1].trim() : '';
    }
    function stripParen(v) {
        if (!v) return '';
        return String(v).replace(/\([^)]*\)/, '').trim();
    }

    function handleSubmit() {
        form.validateFields().then(function(values) {
            setSaving(true);
            CLIENT.call('226008', {
                businessId: String(businessId),
                creator: CUR_USER,
                newCreator: parseParen(values.person1),
                newOrgCode: parseParen(values.dept1),
                newOrgName: stripParen(values.dept1),
                updaterType: updaterType
            }, function() {
                setSaving(false);
                try { window.parent.FR.Msg.toast('申请更改客户经理审批中'); } catch (e) {}
                setTimeout(closeSelf, 300);
            }, function() { setSaving(false); });
        }).catch(function() {});
    }

    return (
        <div style={{ padding: '20px 24px', paddingBottom: 24 }}>
            <Form form={form} layout="vertical" autoComplete="off">
                <Form.Item label="归属机构" name="dept1" rules={[{ required: true, message: '请选择归属机构' }]}>
                    <Select placeholder="请选择归属机构" options={orgOpts} showSearch optionFilterProp="label" />
                </Form.Item>
                <Form.Item label="客户经理" name="person1" rules={[{ required: true, message: '请选择客户经理' }]}>
                    <Select placeholder="请选择客户经理" options={mgrOpts} showSearch optionFilterProp="label" />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <Button onClick={closeSelf}>取消</Button>
                        <Button type="primary" loading={saving} onClick={handleSubmit}>变更申请</Button>
                    </div>
                </Form.Item>
            </Form>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('app-root')).render(
    React.createElement(antd.ConfigProvider, { locale: zhCN },
        React.createElement(App)
    )
);
