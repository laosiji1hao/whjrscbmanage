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
    rating: ['AAA+', 'AAA', 'AAA-', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+'],
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
    status: [{v:'0',t:'未完善'},{v:'1',t:'审核中'},{v:'2',t:'新增审核失败'},{v:'3',t:'生效中'},{v:'4',t:'已过期'},{v:'5',t:'已中止'}],
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
    if (!/^\d+$/.test(s)) return s; // 非纯数字（如 226010 回填带前缀的值）不补零，避免误改成 000…前缀
    while (s.length < 17) s = '0' + s;
    return s;
}

// 还款计划并入主表：读取 bus_bond_business.installment_plan（JSON 数组）→ {json, detail}
// 兼容历史人读串（"还款时间:x,还款金额:y;…"）与空值
function planFromStore(t) {
    var j = (t === undefined || t === null) ? '' : String(t).trim();
    if (j && j.charAt(0) === '[') {
        try {
            var arr = JSON.parse(j);
            if (Array.isArray(arr)) {
                var s = arr.map(function(x) {
                    return '还款时间:' + (x.installmentTime || x.repayment_date || '') +
                           ',还款金额:' + (x.installmentAmount || x.repayment_amount || '');
                }).join(';');
                return { json: j, detail: s };
            }
        } catch (e) {}
    }
    return { json: (j && j !== '[]') ? j : '', detail: j };
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
function closeSelf(msg) {
    try {
        if (window.parent !== window) window.parent.postMessage({ type: 'fr_form_saved', msg: msg || '' }, '*');
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
/* ===== 金市业务池（原 my_business_pc_view + view_manager + view_export）=====
 * URL 参数：mode = view（个人池，默认） / manager（管理岗全行）
 * 操作：完善业务信息(view) / 变更客户经理 / 编辑 / 创建分期(view) / 中止 / 配置上存利率(manager)
 * 导出：本页直接取全量生成 57 列 CSV（替代原 export 页）
 */
function App() {
    var { Table, Button, Input, Select, Space, Modal, AutoComplete } = antd;
    var [mode, setMode] = React.useState(function() {
        try {
            var qm = new URLSearchParams(window.location.search).get('mode');
            if (qm === 'view' || qm === 'manager') return qm;
            // 菜单挂载只能选 cpt、不能带参数 → 不同角色挂不同物理 cpt，
            // gen_pages 会对 business_pool_view / business_pool_manager 注入固定 WINDOW_POOL_MODE
            if (typeof WINDOW_POOL_MODE !== 'undefined' && (WINDOW_POOL_MODE === 'view' || WINDOW_POOL_MODE === 'manager')) {
                return WINDOW_POOL_MODE;
            }
            return 'view';
        } catch (e) { return 'view'; }
    });
    const [data, setData] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [total, setTotal] = React.useState(0);
    const [current, setCurrent] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(20);
    const [custName, setCustName] = React.useState('');
    const [bizName, setBizName] = React.useState('');
    const [status, setStatus] = React.useState('');
    const [custOpts, setCustOpts] = React.useState([]);
    const [bizOpts, setBizOpts] = React.useState([]);
    const [openC, setOpenC] = React.useState(false); // 融资人名称下拉受控（Backspace 需先关下拉）
    const [openB, setOpenB] = React.useState(false); // 项目/债券名称下拉受控
    const [auditMap, setAuditMap] = React.useState({});
    const [modal, setModal] = React.useState({ open: false, url: '', title: '', width: 1000 });

    var IS_MANAGER = mode === 'manager';

    function listParams(page, size) {
        var p = [
            { name: 'p_customer_name', type: 'String', value: custName },
            { name: 'p_biz_name', type: 'String', value: bizName },
            { name: 'p_pageno', type: 'String', value: String(page || 1) },
            { name: 'p_pagesize', type: 'String', value: String(size || pageSize) }
        ];
        if (!IS_MANAGER) {
            p.push({ name: 'p_status', type: 'String', value: status });
        }
        return p;
    }
    function countParams() {
        var p = [
            { name: 'p_customer_name', type: 'String', value: custName },
            { name: 'p_biz_name', type: 'String', value: bizName }
        ];
        if (!IS_MANAGER) p.push({ name: 'p_status', type: 'String', value: status });
        return p;
    }

    function fetchList(page, size) {
        setLoading(true);
        callData(IS_MANAGER ? 'pool_list_all' : 'pool_list_mine', listParams(page, size), function(rows) {
            setData(rows || []);
            setLoading(false);
        }, function() { setLoading(false); });
    }
    function fetchTotal() {
        callData(IS_MANAGER ? 'pool_total_all' : 'pool_total_mine', countParams(), function(rows) {
            if (rows && rows.length) setTotal(parseInt(rows[0].totalcnt, 10) || 0);
            else setTotal(0);
        }, null);
    }
    function reload(page, size) { fetchList(page, size); fetchTotal(); }

    React.useEffect(function() {
        callData('audit_all', [], function(rows) {
            var m = {};
            (rows || []).forEach(function(r) { m[r.bond_code] = r.flow_code || r.approval_id; });
            setAuditMap(m);
        }, null);
        // 筛选下拉数据：融资人名称 / 项目债券名称（DISTINCT）
        callData('pool_filter_opt', [], function(rows) {
            var c = [], b = [], seenC = {}, seenB = {};
            (rows || []).forEach(function(r) {
                var cn = r.customer_name, bn = r.biz_name;
                if (bn && !seenB[bn]) { seenB[bn] = 1; b.push({ value: bn, label: bn }); }
                if (cn && !seenC[cn]) { seenC[cn] = 1; c.push({ value: cn, label: cn }); }
            });
            setCustOpts(c); setBizOpts(b);
        }, null);
        reload(1, pageSize);
    }, []);

    function gated(r) {
        if (auditMap[r.bond_code] !== undefined) { antd.message.warning('本业务正在经历审批流程，不可变更'); return true; }
        return false;
    }
    // 是否在审批中（有在批审批流）→ 审批中的业务不提供任何操作入口
    function inApproval(r) { return auditMap[r.bond_code] !== undefined; }
    var FLOW_LABEL = { 'biz_declare': '新增申请审核中', 'biz_change': '变更申请审批中', 'biz_mgr_change': '客户经理变更申请审批中', 'biz_terminate': '中止申请审批中' };

    function openDialog(pageName, extra, title, width) {
        var q = '';
        if (extra) {
            Object.keys(extra).forEach(function(k) { q += '&' + k + '=' + encodeURIComponent(extra[k]); });
        }
        setModal({
            open: true,
            url: PATH.apiBase + '/view/report?op=write&viewlet=' +
                 PATH.getTemplatePath(pageName + '.cpt') + q,
            title: title,
            width: width
        });
    }

    function actComplete(r) { openDialog('business_form', { mode: 'edit', biz_uuid: r.biz_uuid }, '编辑业务信息', 1200); }
    function actInstallment(r) { openDialog('business_form', { mode: 'installment', biz_uuid: r.biz_uuid }, '创建分期业务', 1200); }
    function actChangeMgr(r) {
        if (gated(r)) return;
        if (String(r.status) !== '3') { antd.message.warning('只有生效中的业务才能变更'); return; }
        openDialog('manager_change', { biz_uuid: r.biz_uuid, updaterType: IS_MANAGER ? 1 : 0 }, '编辑业务所属客户经理', 600);
    }
    function actEdit(r) {
        if (gated(r)) return;
        if (String(r.status) !== '3' && String(r.status) !== '2') { antd.message.warning('只有生效中或新增审核失败的业务才能编辑'); return; }
        if (String(r.status) === '2') {
            // 新增审核失败/被否决：打开申报表单，在被否决基础上修改后重新发起新增申请
            openDialog('business_form', { mode: 'edit', biz_uuid: r.biz_uuid }, '编辑业务信息（重新申报）', 1200);
        } else {
            openDialog('business_look', { biz_uuid: r.biz_uuid, updaterType: IS_MANAGER ? 1 : 0 }, '编辑业务信息', 1200);
        }
    }
    function actStop(r) {
        if (gated(r)) return;
        if (String(r.status) === '4') { antd.message.warning('已过期的业务不允许中止'); return; }
        Modal.confirm({
            title: '提示', content: '确认中止业务?', okText: '确定', cancelText: '取消',
            onOk: function() {
                CLIENT.call('226009', { businessId: r.biz_uuid, bondCode: r.bond_code, terminator: CUR_USER, updaterType: IS_MANAGER ? '1' : '0' }, function() {
                    try { window.parent.FR.Msg.toast('中止业务流程审批中'); } catch (e) {}
                    antd.message.success('中止业务流程审批中', 2);
                    reload(current, pageSize);
                }, function() { antd.message.error('中止申请提交失败，请重试'); });
            }
        });
    }
    function actConfig() { openDialog('config', { id: 0 }, '配置计算参数', 700); }
    function actDelete(r) {
        if (gated(r)) return;
        Modal.confirm({
            title: '提示', content: '确认删除该笔新增审核失败的业务？', okText: '确定', cancelText: '取消',
            onOk: function() {
                CLIENT.call('22600D', { businessId: r.biz_uuid, bondCode: r.bond_code }, function() {
                    try { window.parent.FR.Msg.toast('已删除'); } catch (e) {}
                    antd.message.success('已删除', 2);
                    reload(current, pageSize);
                }, function() { antd.message.error('删除失败，请重试'); });
            }
        });
    }
    function actAdd() { openDialog('business_form', { mode: 'add', biz_uuid: '' }, '新增业务信息', 1200); }

    function handlePageChange(page, size) { setCurrent(page); setPageSize(size); reload(page, size); }
    function handleSearch() { setCurrent(1); reload(1, pageSize); }
    function handleReset() {
        setCustName(''); setBizName(''); setStatus(''); setCurrent(1);
        setTimeout(function() { reload(1, pageSize); }, 0);
    }

    React.useEffect(function() {
        function handler(e) {
            var d = e.data;
            if (!d) return;
            if (d.type === 'fr_form_saved') {
                if (d.msg) antd.message.success(d.msg, 2); // 父级可见的成功提示
                setModal({ open: false, url: '', title: '', width: 1000 });
                reload(current, pageSize);
            }
            if (d.type === 'fr_iframe_resize') {
                var f = document.getElementById('poolFrame');
                if (f) f.style.height = Math.max(300, Math.min(d.height + 20, 700)) + 'px';
            }
        }
        window.addEventListener('message', handler);
        return function() { window.removeEventListener('message', handler); };
    }, [current, pageSize]);

    // ── 导出（57 列，取全量）────────────────────────────────────────────
    function expVal(r, k, dict) {
        var v = r[k];
        function ynNot(x) { return String(x) === '1' ? '是' : '不涉及'; }
        if (dict === 'ynNot') return ynNot(v);
        if (dict === 'yn') return ynText(v);
        if (dict === 'status') return statusText(v);
        if (DICTS[dict]) return dictText(DICTS[dict], v);
        return v === undefined || v === null ? '' : String(v);
    }
    function handleExport() {
        setLoading(true);
        callData(IS_MANAGER ? 'pool_list_all' : 'pool_list_mine', listParams(1, 100000), function(rows) {
            setLoading(false);
            if (!rows || !rows.length) { antd.message.warning('没有可导出的数据'); return; }
            var cols = [
                ['债券编号或内部编号', 'bond_code', null], ['ECIF客户编号', 'ecif_customer_no', null],
                ['客户编号', 'customer_no', null], ['融资人名称', 'customer_name', null],
                ['项目/债券名称', 'biz_name', null], ['标准/非标准', 'bond_type', 'bondType'],
                ['业务品种', 'biz_type', 'bizType'], ['是否绿色/科技/养老/不涉及', 'green_tech_flag', 'greenTech'],
                ['外部信用评级', 'ext_rating', null], ['外部信用评级日期', 'ext_rating_date', null],
                ['外部评级机构', 'rating_agency', null], ['内部评级', 'int_rating', null],
                ['内部评级日期', 'int_rating_date', null], ['行业分类', 'industry', 'industry'],
                ['客户分类', 'customer_type', 'customerType'], ['是否我行预警客户', 'alert_customer', 'ynNot'],
                ['发放日/购买日', 'start_date', null], ['到期日', 'mature_date', null],
                ['币种', 'currency', null], ['初始金额', 'orig_amount', null],
                ['初始金额(折人民币)', 'rmb_amount', null], ['业务余额(折人民币)', 'balance', null],
                ['投资利率(%)', 'invest_rate', null], ['价值转移利率(%)', 'transfer_rate', null],
                ['担保情况', 'guarantee_info', null], ['是否逾欠/违约', 'breach_flag', 'ynNot'],
                ['五级分类', 'five_level_class', 'fiveLevel'], ['是否涉及我行资金监管', 'fund_used_flag', 'ynNot'],
                ['我行监管资金是否已使用完毕', 'fund_used_up', 'ynNot'], ['是否涉及分期还款', 'installment_flag', 'ynNot'],
                ['还款计划', 'installment_plan', null], ['是否我行承销', 'our_bank_underwrite', 'yn'],
                ['主承销商/联席主承销商', 'lead_underwriter', null], ['所属管理条线', 'manage_line', null],
                ['对应处室', 'dept', 'dept'], ['约定资金用途', 'agreed_usage', null],
                ['是否有资金发放账户', 'fund_account_flag', 'ynNot'], ['资金发放/募集账户账号(我行)', 'fund_account', null],
                ['是否有资金监管账户', 'supervise_account_flag', 'ynNot'], ['资金监管/回款专户账号(我行)', 'supervise_account', null],
                ['是否原资产管理部回表业务', 'is_original_am', 'ynNot'], ['是否行权', 'exercise_flag', 'ynNot'],
                ['行权日期', 'exercise_date', null], ['支用检查情况', 'drawdown_check', null],
                ['批复号', 'remark_number', null], ['批复管理要求', 'remark', null],
                ['是否金融市场部批复管理要求', 'js_remark_flag', 'ynNot'], ['金融市场部批复管理要求', 'js_remark', null],
                ['实地检查频率(月)', 'inspect_freq', null], ['投后检查实施人员岗位', 'inspector_post', null],
                ['客户经理', 'related_name', null], ['业务发生机构', 'org_name', null],
                ['业务状态', 'status', 'status'], ['是否有通道费', 'is_passage', 'ynNot'],
                ['通道费金额(%)', 'passage_amount', null], ['上存利率(%)', 'upper_storage_rate', null]
            ];
            var headers = ['序号'].concat(cols.map(function(c) { return c[0]; }));
            var body = rows.map(function(r, i) {
                return [i + 1].concat(cols.map(function(c) { return expVal(r, c[1], c[2]); }));
            });
            downloadXlsx('金市业务_' + dayjs().format('YYYYMMDDHHmmss') + '.xlsx', headers, body);
        }, function() { setLoading(false); });
    }

    var actCols = [];
    if (!IS_MANAGER) {
        actCols.push({ key: 'a1', label: '完善业务信息', show: function(r) { return String(r.status) === '0' && !inApproval(r); }, fn: actComplete });
    }
    actCols.push({ key: 'a2', label: '变更客户经理', show: function(r) { return String(r.status) === '3' && !inApproval(r); }, fn: actChangeMgr });
    actCols.push({ key: 'a3', label: '编辑', show: function(r) { return (String(r.status) === '2' || String(r.status) === '3') && !inApproval(r); }, fn: actEdit });
    if (!IS_MANAGER) {
        actCols.push({ key: 'a4', label: '创建分期', show: function(r) { return String(r.status) === '3' && !inApproval(r); }, fn: actInstallment });
    }
    actCols.push({ key: 'a5', label: '中止', show: function(r) { return String(r.status) === '3' && !inApproval(r); }, fn: actStop });
    actCols.push({ key: 'a6', label: '删除', show: function(r) { return String(r.status) === '2' && !inApproval(r); }, fn: actDelete });

    // 表头（业务口径）：业务管理=manager / 我的业务=view
    //   序号 债券编号 ECIF客户编号 客户编号 融资人名称 项目名称 创建日期 状态 [+ 业务所属客户经理 业务所属机构]
    // 列宽可用鼠标拖表头右缘调整；按 页面+角色 记在本机浏览器里，刷新后保持
    var COLS_KEY = 'whjrscb_pool_colw_' + mode;
    // 两步赋值写法（等同 writer 的 Hook 解构转换产物）：帆软填报预览下 useState 解构会失效，
    // 且该转换只认 const [...]，这里直接写成转换后的形状，避免漏转
    var colWHook = React.useState(function() {
        try { return JSON.parse(window.localStorage.getItem(COLS_KEY) || '{}') || {}; } catch (e) { return {}; }
    });
    var colW = colWHook[0];
    var setColW = colWHook[1];
    // 表格容器宽度：用来补一列占位列，把容器余量吃掉
    // （否则 antd 会把各列等比撑开，拖动 200px 实际只走 ~100px，手感对不上）
    var wrapHook = React.useState(0);
    var wrapW = wrapHook[0];
    var setWrapW = wrapHook[1];
    var wrapRef = React.useRef(null);
    React.useEffect(function() {
        var el = wrapRef.current;
        if (!el) return;
        function sync() { setWrapW(el.clientWidth); }
        sync();
        var ro = null;
        if (window.ResizeObserver) { ro = new ResizeObserver(sync); ro.observe(el); }
        else { window.addEventListener('resize', sync); }
        return function() { if (ro) ro.disconnect(); else window.removeEventListener('resize', sync); };
    }, []);
    function rememberWidths(w) {
        try { window.localStorage.setItem(COLS_KEY, JSON.stringify(w)); } catch (e) {}
    }
    function startResize(colKey, e) {
        e.preventDefault();
        e.stopPropagation();
        var startX = e.clientX;
        // 起点必须是「表头此刻的真实宽度」，不能用存过的值/兜底值，否则一拖就跳
        var th = e.currentTarget && e.currentTarget.closest ? e.currentTarget.closest('th') : null;
        var startW = th ? Math.round(th.getBoundingClientRect().width) : (colW[colKey] || 100);
        function onMove(ev) {
            var w = Math.max(56, Math.round(startW + ev.clientX - startX));
            setColW(function(prev) { var n = Object.assign({}, prev); n[colKey] = w; return n; });
        }
        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.body.style.userSelect = '';
            setColW(function(prev) { rememberWidths(prev); return prev; });
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.body.style.userSelect = 'none';
    }
    function ResizableHeader(props) {
        var onResize = props.onResize;
        var rest = {};
        Object.keys(props).forEach(function(k) { if (k !== 'onResize') rest[k] = props[k]; });
        rest.style = Object.assign({}, rest.style, { position: 'relative' });
        if (!onResize) return React.createElement('th', rest, rest.children);
        return React.createElement('th', rest, rest.children,
            React.createElement('span', {
                key: 'rz',
                style: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'col-resize',
                         userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' },
                onMouseDown: function(e) { onResize(e); }
            },
            React.createElement('span', { style: { width: 2, height: '55%', background: '#d9d9d9' } }))
        );
    }

    var BASE_COLS = [
        { title: '序号', key: '__idx', width: 60, render: function(_, __, i) { return (current - 1) * pageSize + i + 1; } },
        { title: '债券编号', key: 'bond_code', dataIndex: 'bond_code', width: 130 },
        { title: 'ECIF客户编号', key: 'ecif_customer_no', dataIndex: 'ecif_customer_no', width: 120 },
        { title: '客户编号', key: 'customer_no', dataIndex: 'customer_no', width: 110 },
        { title: '融资人名称', key: 'customer_name', dataIndex: 'customer_name', width: 180, ellipsis: true },
        { title: '项目名称', key: 'biz_name', dataIndex: 'biz_name', width: 200, ellipsis: true },
        { title: '创建日期', key: 'create_time', dataIndex: 'create_time', width: 120, render: function(v) { return fmtDate(v); } },
        { title: '状态', key: 'status', dataIndex: 'status', width: 90, render: function(v) { return statusText(v); } }
    ];
    if (IS_MANAGER) {
        BASE_COLS.push({ title: '业务所属客户经理', key: 'related_name', dataIndex: 'related_name', width: 140, render: function(v) { return v || ''; } });
        BASE_COLS.push({ title: '业务所属机构', key: 'dept_name', dataIndex: 'dept_name', width: 140, render: function(v) { return v || ''; } });
    }
    BASE_COLS.push({ title: '操作', key: '__act', width: IS_MANAGER ? 180 : 260, fixed: 'right',
        render: function(_, r) {
            if (inApproval(r)) {
                var lbl = FLOW_LABEL[auditMap[r.bond_code]] || '审批中';
                return React.createElement('span', { style: { color: '#fa8c16' } }, lbl);
            }
            var btns = [];
            actCols.forEach(function(a) {
                if (!a.show(r)) return;
                btns.push(React.createElement(Button, {
                    key: a.key, size: 'small', type: 'link',
                    onClick: function() { a.fn(r); }
                }, a.label));
            });
            return React.createElement(Space, { size: 0 }, btns);
        } });

    var totalW = 0;
    var columns = BASE_COLS.map(function(c) {
        var w = colW[c.key] || c.width;
        totalW += w;
        return Object.assign({}, c, {
            width: w,
            onHeaderCell: function() { return { width: w, onResize: function(e) { startResize(c.key, e); } }; }
        });
    });
    // 占位列：吃掉容器余量，使 sum(列宽)==容器宽度 —— 各列严格等于声明宽度，拖动 1:1
    var spacer = Math.max(0, Math.round(wrapW - totalW));
    var tableCols = spacer > 1
        ? columns.concat([{ title: '', key: '__spacer', width: spacer, render: function() { return ''; } }])
        : columns;
    return (
        <div style={{ padding: '16px', background: '#f5f5f5', minHeight: '100vh' }}>
            <div style={{ background: '#fff', padding: '16px 24px', borderRadius: '8px' }}>
                <div style={{ color: '#888', marginBottom: 16 }}>当前查询结果条数为：{total}</div>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <Space wrap>
                        <span>融资人名称:</span>
                        <AutoComplete allowClear placeholder="全部" style={{ width: 180 }} value={custName || undefined}
                            open={openC} onDropdownVisibleChange={setOpenC}
                            onKeyDown={function(e) { if (e.key === 'Backspace') { e.preventDefault(); setOpenC(false); setCustName(function(p) { return String(p || '').slice(0, -1); }); } }}
                            onChange={function(v) { setCustName(v || ''); }}
                            options={custOpts} filterOption={function(input, option) { return String(option.value).indexOf(String(input)) !== -1; }} />
                        <span>项目/债券名称:</span>
                        <AutoComplete allowClear placeholder="全部" style={{ width: 180 }} value={bizName || undefined}
                            open={openB} onDropdownVisibleChange={setOpenB}
                            onKeyDown={function(e) { if (e.key === 'Backspace') { e.preventDefault(); setOpenB(false); setBizName(function(p) { return String(p || '').slice(0, -1); }); } }}
                            onChange={function(v) { setBizName(v || ''); }}
                            options={bizOpts} filterOption={function(input, option) { return String(option.value).indexOf(String(input)) !== -1; }} />
                        {!IS_MANAGER && (
                            <React.Fragment>
                                <span>状态:</span>
                                <Select allowClear placeholder="全部" style={{ width: 120 }} value={status || undefined}
                                    onChange={function(v) { setStatus(v || ''); }} options={selOpts(DICTS.status)} />
                            </React.Fragment>
                        )}
                        <Button type="primary" icon={icon('/outlined/search.svg')} onClick={handleSearch}>查询</Button>
                        <Button icon={icon('/outlined/reload.svg')} onClick={handleReset}>重置</Button>
                        {!IS_MANAGER && (
                            <Button type="primary" icon={icon('/outlined/plus.svg')} onClick={actAdd}>新增业务</Button>
                        )}
                    </Space>
                    <Space>
                        <Button icon={icon('/outlined/export.svg')} onClick={handleExport}>导出</Button>
                        {IS_MANAGER && (
                            <Button icon={icon('/outlined/setting.svg')} onClick={actConfig}>配置上存利率计算参数</Button>
                        )}
                    </Space>
                </div>

                <div ref={wrapRef}>
                <Table rowKey="id" loading={loading} columns={tableCols} dataSource={data} size="middle"
                    components={{ header: { cell: ResizableHeader } }}
                    scroll={{ x: totalW + spacer, y: 'calc(100vh - 320px)' }} pagination={{
                        current: current, pageSize: pageSize, total: total,
                        showSizeChanger: true, showQuickJumper: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        showTotal: function(t) { return '共 ' + t + ' 条'; },
                        onChange: handlePageChange
                    }} />

                </div>

                {modal.open && (
                    <Modal title={modal.title} open={true} footer={null} width={modal.width} destroyOnClose
                        onCancel={function() { setModal({ open: false, url: '', title: '', width: 1000 }); }}
                        styles={{ body: { padding: 0 } }}>
                        <iframe id="poolFrame" src={modal.url}
                            style={{ width: '100%', height: '560px', minHeight: '300px', maxHeight: '700px', border: 'none' }} />
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
