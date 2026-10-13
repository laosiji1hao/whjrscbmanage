(() => {
  // pages/business_pool_view.jsx
  var PATH = {
    currentDir: (function() {
      var name = null;
      try {
        name = FR.remoteEvaluate("=reportName");
      } catch (e) {
      }
      return name ? name.substring(0, name.lastIndexOf("/") + 1) : "whjrscbmanage/pages/";
    })(),
    apiBase: (function() {
      var su = null;
      try {
        su = servletURL;
      } catch (e) {
      }
      if (!su) {
        try {
          su = FR.remoteEvaluate("=servletURL");
        } catch (e2) {
        }
      }
      if (!su) return "/webroot/decision";
      var parts = su.split("/");
      return "/" + parts[1] + "/" + parts[2];
    })(),
    getDataTemplate: function(filename) {
      return this.currentDir.replace("/pages/", "/data/") + filename;
    },
    getTemplatePath: function(filename) {
      return this.currentDir + filename;
    }
  };
  var hideStyle = document.createElement("style");
  hideStyle.innerHTML = '.fr-report{position:absolute!important;left:-9999px!important;visibility:hidden!important}.content-container,.fr-content,.reportPane{height:0!important;overflow:hidden!important;pointer-events:none!important}body>.textbox-container,body>#textboxContainer,body>.widget-container{display:none!important}[data-sentinel-button],[class*="sentinel-ant-float-btn"]{display:none!important;visibility:hidden!important;pointer-events:none!important}';
  document.head.appendChild(hideStyle);
  document.body.setAttribute(
    "style",
    "margin:0;padding:0;min-height:100vh;box-sizing:border-box;overflow-y:auto;"
  );
  var appRoot = document.createElement("div");
  appRoot.id = "app-root";
  document.body.insertBefore(appRoot, document.body.firstChild);
  var DATA_CPT = "whjrscbmanage_data.cpt";
  var CLOUD_FALLBACK = { cloudUrl: "http://localhost:9058", prjId: "whjrscbmanage" };
  var zhCN = {
    locale: "zh-cn",
    Pagination: {
      items_per_page: "条/页",
      jump_to: "跳至",
      jump_to_confirm: "确定",
      page: "页",
      prev_page: "上一页",
      next_page: "下一页",
      prev_5: "向前 5 页",
      next_5: "向后 5 页",
      prev_3: "向前 3 页",
      next_3: "向后 3 页",
      page_size: "页码"
    },
    Table: {
      filterTitle: "筛选",
      filterConfirm: "确定",
      filterReset: "重置",
      selectAll: "全选",
      selectInvert: "反选",
      sortTitle: "排序",
      expand: "展开行",
      collapse: "折叠行",
      emptyText: "暂无数据"
    },
    Modal: { okText: "确定", cancelText: "取消", justOkText: "知道了" },
    Popconfirm: { okText: "确定", cancelText: "取消" },
    Form: { optional: "（可选）", defaultValidateMessages: {
      default: "字段验证错误 ${label}",
      required: "请输入 ${label}",
      enum: "${label} 必须是其中一个",
      whitespace: "不能输入空格"
    } },
    Empty: { description: "暂无数据" },
    // antd v5 DatePicker 日历面板中文（月份/星期/操作钮），否则默认英文 August/Sunday
    DatePicker: {
      lang: {
        locale: "zh-cn",
        monthBeforeYear: false,
        yearFormat: "YYYY年",
        monthFormat: "M月",
        dayFormat: "D",
        cellDateFormat: "D",
        fieldDateFormat: "YYYY-MM-DD",
        fieldDateTimeFormat: "YYYY-MM-DD HH:mm:ss",
        fieldMonthFormat: "YYYY-MM",
        fieldWeekFormat: "YYYY-wo",
        fieldQuarterFormat: "YYYY-[Q]Q",
        fieldYearFormat: "YYYY",
        years: "年",
        months: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
        monthsShort: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
        monthText: "月份",
        quarterText: "季度",
        today: "今天",
        now: "此刻",
        okText: "确定",
        cancelText: "取消",
        nextYear: "下一年",
        prevYear: "上一年",
        nextMonth: "下月",
        prevMonth: "上月",
        yearToday: "今年",
        weekdays: ["日", "一", "二", "三", "四", "五", "六"],
        weekdaysShort: ["日", "一", "二", "三", "四", "五", "六"],
        weekdaysMin: ["日", "一", "二", "三", "四", "五", "六"],
        firstDayOfWeek: 0
      },
      timePickerLocale: { placeholder: "请选择时间", rangePlaceholder: ["开始时间", "结束时间"] },
      placeholder: "请选择日期",
      rangePlaceholder: ["开始日期", "结束日期"]
    },
    Select: { placeholder: "请选择" }
  };
  try {
    dayjs.locale("zh-cn", {
      months: "一月_二月_三月_四月_五月_六月_七月_八月_九月_十月_十一月_十二月".split("_"),
      monthsShort: "1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月".split("_"),
      weekdays: "星期日_星期一_星期二_星期三_星期四_星期五_星期六".split("_"),
      weekdaysShort: "周日_周一_周二_周三_周四_周五_周六".split("_"),
      weekdaysMin: "日_一_二_三_四_五_六".split("_"),
      weekdaysParseExact: true
    }, true);
  } catch (e) {
  }
  var iconBase = PATH.apiBase.replace("/decision", "/help/lib/antd/icons");
  var iconCache = {};
  (function() {
    var names = [
      "search",
      "plus",
      "reload",
      "edit",
      "delete",
      "close",
      "check",
      "filter",
      "export",
      "download",
      "setting",
      "user",
      "exclamation-circle"
    ];
    names.forEach(function(name) {
      $.ajax({
        url: iconBase + "/outlined/" + name + ".svg",
        type: "GET",
        async: false,
        dataType: "text",
        success: function(svg) {
          iconCache[name] = svg;
        },
        error: function() {
          iconCache[name] = null;
        }
      });
    });
  })();
  function icon(name) {
    var key = name.replace("/outlined/", "").replace(".svg", "");
    var svg = iconCache[key];
    if (!svg) return null;
    svg = svg.replace("<svg ", '<svg fill="currentColor" width="1em" height="1em" ');
    return React.createElement("span", {
      style: { display: "inline-flex", alignItems: "center", lineHeight: 1 },
      dangerouslySetInnerHTML: { __html: svg }
    });
  }
  var CUR_USER = (function() {
    try {
      return String(FR.remoteEvaluate("=$fine_username") || "");
    } catch (e) {
      return "";
    }
  })();
  function identityParams() {
    return [
      { name: "p_operator", type: "String", value: CUR_USER },
      { name: "user_name", type: "String", value: CUR_USER }
    ];
  }
  function callData(dsName, params, onOk, onErr) {
    $.ajax({
      url: PATH.apiBase + "/api/data",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify({
        report_path: PATH.getDataTemplate(DATA_CPT),
        datasource_name: dsName,
        page_number: -1,
        page_size: -1,
        parameters: (params || []).concat(identityParams())
      }),
      success: function(res) {
        if (typeof res === "string") {
          try {
            res = JSON.parse(res);
          } catch (e) {
          }
        }
        if (!res || res.err_code !== 0) {
          antd.message.error(res && res.err_msg || "操作失败");
          if (onErr) onErr(res);
          return;
        }
        if (onOk) onOk(res.data || []);
      },
      error: function(xhr, status, error) {
        antd.message.error("网络错误：" + error);
        if (onErr) onErr(null);
      }
    });
  }
  var CLIENT = (function() {
    function text(v) {
      if (v === null || v === void 0) return "";
      return String(v);
    }
    function remote(p) {
      try {
        return text(FR.remoteEvaluate("=$" + p));
      } catch (e) {
        return "";
      }
    }
    function resolve(promise) {
      try {
        var r = remote(promise);
        if (r) return r;
      } catch (e) {
      }
      if (typeof myFR !== "undefined" && myFR[promise]) return myFR[promise];
      return CLOUD_FALLBACK[promise];
    }
    function ensureLoaded() {
      if (typeof window.myFR !== "undefined") return true;
      try {
        var url = PATH.apiBase.replace("/decision", "") + "/js/myFR.js";
        var r = (function() {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, false);
          xhr.send(null);
          return xhr.responseText;
        })();
        if (!r) return false;
        new Function(r)();
        return typeof window.myFR !== "undefined";
      } catch (e) {
        return false;
      }
    }
    var loaded = ensureLoaded();
    return {
      ready: loaded,
      cloudUrl: function() {
        try {
          var v = remote("cloudUrl");
          if (v) return v;
        } catch (e) {
        }
        if (typeof myFR !== "undefined" && myFR.cloudUrl) return myFR.cloudUrl;
        return CLOUD_FALLBACK.cloudUrl;
      },
      call: function(code, body, onOk, onErr) {
        if (!ensureLoaded() || typeof window.myFR === "undefined" || !window.myFR.callCloud) {
          antd.message.warning("云平台服务不可用（myFR 未加载），请检查后重试");
          if (onErr) onErr(null);
          return;
        }
        try {
          var cu = this.cloudUrl();
          if (!myFR.cloudUrl) myFR.cloudUrl = cu;
          if (!myFR.prjId) myFR.prjId = CLOUD_FALLBACK.prjId;
          window.myFR.callCloud(String(code), body || {}, function(data) {
            if (onOk) onOk(data);
          }, function(msg) {
            if (msg) {
              try {
                antd.message.error(String(msg));
              } catch (e) {
              }
            }
            if (onErr) onErr(null);
          }, true);
        } catch (e) {
          if (onErr) onErr(null);
        }
      }
    };
  })();
  var DICT_YN = [{ v: "0", t: "否" }, { v: "1", t: "是" }];
  var DICTS = {
    "yn": DICT_YN,
    symbolStandard: [{ v: "0", t: "标准化业务" }, { v: "1", t: "非标准化业务" }],
    greenTech: [{ v: "0", t: "绿色" }, { v: "1", t: "科技" }, { v: "2", t: "养老" }, { v: "3", t: "不涉及" }],
    industry: [
      { v: "0", t: "金融业" },
      { v: "1", t: "房地产业" },
      { v: "2", t: "租赁和商务服务业" },
      { v: "3", t: "科学研究和技术服务业" },
      { v: "4", t: "水利、环境和公共设施管理业" },
      { v: "5", t: "居民服务、修理和其他服务业" },
      { v: "6", t: "教育、卫生和社会工作" },
      { v: "7", t: "文化、体育和娱乐业" },
      { v: "8", t: "公共管理、社会保障和社会组织" },
      { v: "9", t: "农、林、牧、渔业" },
      { v: "10", t: "采矿业" },
      { v: "11", t: "制造业" },
      { v: "12", t: "电力、热力、燃气及水生产和供应业" },
      { v: "13", t: "建筑业" },
      { v: "14", t: "批发和零售业" },
      { v: "15", t: "交通运输、仓储和邮政业" },
      { v: "16", t: "住宿和餐饮业" },
      { v: "17", t: "信息传输、软件和信息技术服务业" }
    ],
    customerType: [{ v: "0", t: "一类" }, { v: "1", t: "二类" }, { v: "2", t: "三类" }, { v: "3", t: "四类" }],
    currency: [{ v: "人民币", t: "人民币" }, { v: "美元", t: "美元" }],
    guaranty: [{ v: "0", t: "信用" }, { v: "1", t: "抵押" }, { v: "2", t: "质押" }, { v: "3", t: "保证" }],
    fiveLevel: ["正常一档", "正常二档", "正常三档", "关注", "次级", "可疑", "损失"],
    manageLine: [{ v: "金融市场部", t: "金融市场部" }],
    dept: [{ v: "0", t: "同业室" }, { v: "1", t: "利率室" }, { v: "2", t: "汇率室" }, { v: "3", t: "同业营销管理室" }, { v: "4", t: "自负盈亏账户" }],
    rating: ["AAA+", "AAA", "AAA-", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+"],
    exercise: [{ v: "0", t: "否" }, { v: "1", t: "是" }],
    bizType: [
      { v: "0", t: "非金融企业类债券投资" },
      { v: "1", t: "企业资产支持证券" },
      { v: "2", t: "非交易类-产业基金" },
      { v: "3", t: "非交易类-城镇化建设基金" },
      { v: "4", t: "非交易类-同业资产收益权" },
      { v: "5", t: "交易类-保险债权投资计划" },
      { v: "6", t: "交易类-券商收益权凭证" },
      { v: "7", t: "交易类-特定目的载体投资信用债" },
      { v: "8", t: "交易类-债权融资计划" },
      { v: "9", t: "金租通" },
      { v: "10", t: "银证投融通" },
      { v: "11", t: "债务融资工具(余额包销或持有)" },
      { v: "12", t: "其他" }
    ],
    status: [{ v: "0", t: "未完善" }, { v: "1", t: "审核中" }, { v: "2", t: "新增审核失败" }, { v: "3", t: "生效中" }, { v: "4", t: "已过期" }, { v: "5", t: "已中止" }],
    ynNot: [{ v: "0", t: "不涉及" }, { v: "1", t: "是" }]
  };
  DICTS.bondType = DICTS.symbolStandard;
  function dictText(dic, v) {
    if (v === void 0 || v === null || v === "") return "";
    var s = String(v);
    var arr = dic || [];
    for (var i = 0; i < arr.length; i++) {
      if (String(arr[i].v) === s) return arr[i].t;
    }
    if (typeof arr[0] === "string") {
      return s;
    }
    return s;
  }
  function selOpts(arr) {
    if (!arr) return [];
    return arr.map(function(o) {
      if (o && typeof o === "object" && "v" in o) {
        return { value: String(o.v), label: o.t === void 0 || o.t === null ? "" : String(o.t) };
      }
      return o;
    });
  }
  function statusText(v) {
    return dictText(DICTS.status, v);
  }
  function ynText(v) {
    if (v === void 0 || v === null || v === "") return "";
    var s = String(v).toLowerCase();
    if (s === "1" || s === "true") return "是";
    if (s === "0" || s === "false") return "否";
    return String(v);
  }
  function fmtDate(v) {
    if (v === void 0 || v === null || v === "") return "";
    var d = dayjs(v);
    return d.isValid() ? d.format("YYYY-MM-DD") : String(v);
  }
  function xmlEscape(v) {
    return String(v).split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split('"').join("&quot;").split("\n").join("&#10;");
  }
  function colName(c) {
    var s = "";
    c = c + 1;
    while (c > 0) {
      var m = (c - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      c = Math.floor((c - 1) / 26);
    }
    return s;
  }
  function xlsxCell(r, c, val) {
    var ref = colName(c) + r;
    var s = val === void 0 || val === null ? "" : String(val);
    if (s !== "" && /^-?\d+(\.\d+)?$/.test(s)) {
      return '<c r="' + ref + '"><v>' + s + "</v></c>";
    }
    return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + xmlEscape(s) + "</t></is></c>";
  }
  function ensureJSZip(cb, onErr) {
    if (typeof JSZip !== "undefined") {
      cb();
      return;
    }
    var s = document.createElement("script");
    s.src = PATH.apiBase.replace("/decision", "") + "/js/jszip.min.js";
    s.onload = function() {
      cb();
    };
    s.onerror = function() {
      if (onErr) onErr();
    };
    document.head.appendChild(s);
  }
  function downloadXlsx(filename, headers, rows) {
    ensureJSZip(function() {
      var i, j;
      var rowXml = [];
      var hs = [];
      for (j = 0; j < headers.length; j++) hs.push(xlsxCell(1, j, headers[j]));
      rowXml.push('<row r="1">' + hs.join("") + "</row>");
      for (i = 0; i < rows.length; i++) {
        var cs = [];
        for (j = 0; j < rows[i].length; j++) cs.push(xlsxCell(i + 2, j, rows[i][j]));
        rowXml.push('<row r="' + (i + 2) + '">' + cs.join("") + "</row>");
      }
      var sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + rowXml.join("") + "</sheetData></worksheet>";
      var zip = new JSZip();
      zip.file(
        "[Content_Types].xml",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
      );
      zip.file(
        "_rels/.rels",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
      );
      zip.file(
        "xl/workbook.xml",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'
      );
      zip.file(
        "xl/_rels/workbook.xml.rels",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
      );
      zip.file("xl/worksheets/sheet1.xml", sheetXml);
      zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }).then(function(blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() {
          URL.revokeObjectURL(url);
        }, 1e3);
      });
    }, function() {
      antd.message.error("Excel 导出库加载失败");
    });
  }
  var WINDOW_POOL_MODE = "view";
  function App() {
    var { Table, Button, Input, Select, Space, Modal } = antd;
    var [mode, setMode] = React.useState(function() {
      try {
        var qm = new URLSearchParams(window.location.search).get("mode");
        if (qm === "view" || qm === "manager") return qm;
        if (typeof WINDOW_POOL_MODE !== "undefined" && (WINDOW_POOL_MODE === "view" || WINDOW_POOL_MODE === "manager")) {
          return WINDOW_POOL_MODE;
        }
        return "view";
      } catch (e) {
        return "view";
      }
    });
    const [data, setData] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [total, setTotal] = React.useState(0);
    const [current, setCurrent] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(20);
    const [custName, setCustName] = React.useState("");
    const [bizName, setBizName] = React.useState("");
    const [status, setStatus] = React.useState("");
    const [custOpts, setCustOpts] = React.useState([]);
    const [bizOpts, setBizOpts] = React.useState([]);
    const [auditMap, setAuditMap] = React.useState({});
    const [modal, setModal] = React.useState({ open: false, url: "", title: "", width: 1e3 });
    var IS_MANAGER = mode === "manager";
    function listParams(page, size) {
      var p = [
        { name: "p_customer_name", type: "String", value: custName },
        { name: "p_biz_name", type: "String", value: bizName },
        { name: "p_pageno", type: "String", value: String(page || 1) },
        { name: "p_pagesize", type: "String", value: String(size || pageSize) }
      ];
      if (!IS_MANAGER) {
        p.push({ name: "p_status", type: "String", value: status });
      }
      return p;
    }
    function countParams() {
      var p = [
        { name: "p_customer_name", type: "String", value: custName },
        { name: "p_biz_name", type: "String", value: bizName }
      ];
      if (!IS_MANAGER) p.push({ name: "p_status", type: "String", value: status });
      return p;
    }
    function fetchList(page, size) {
      setLoading(true);
      callData(IS_MANAGER ? "pool_list_all" : "pool_list_mine", listParams(page, size), function(rows) {
        setData(rows || []);
        setLoading(false);
      }, function() {
        setLoading(false);
      });
    }
    function fetchTotal() {
      callData(IS_MANAGER ? "pool_total_all" : "pool_total_mine", countParams(), function(rows) {
        if (rows && rows.length) setTotal(parseInt(rows[0].totalcnt, 10) || 0);
        else setTotal(0);
      }, null);
    }
    function reload(page, size) {
      fetchList(page, size);
      fetchTotal();
    }
    React.useEffect(function() {
      callData("audit_all", [], function(rows) {
        var m = {};
        (rows || []).forEach(function(r) {
          m[r.bond_code] = r.approval_id;
        });
        setAuditMap(m);
      }, null);
      callData("pool_filter_opt", [], function(rows) {
        var c = [], b = [], seenC = {}, seenB = {};
        (rows || []).forEach(function(r) {
          var cn = r.customer_name, bn = r.biz_name;
          if (bn && !seenB[bn]) {
            seenB[bn] = 1;
            b.push({ value: bn, label: bn });
          }
          if (cn && !seenC[cn]) {
            seenC[cn] = 1;
            c.push({ value: cn, label: cn });
          }
        });
        setCustOpts(c);
        setBizOpts(b);
      }, null);
      reload(1, pageSize);
    }, []);
    function gated(r) {
      if (auditMap[r.bond_code] !== void 0) {
        antd.message.warning("本业务正在经历审批流程，不可变更");
        return true;
      }
      return false;
    }
    function openDialog(pageName, extra, title, width) {
      var q = "";
      if (extra) {
        Object.keys(extra).forEach(function(k) {
          q += "&" + k + "=" + encodeURIComponent(extra[k]);
        });
      }
      setModal({
        open: true,
        url: PATH.apiBase + "/view/report?op=write&viewlet=" + PATH.getTemplatePath(pageName + ".cpt") + q,
        title,
        width
      });
    }
    function actComplete(r) {
      openDialog("business_form", { mode: "edit", biz_uuid: r.biz_uuid }, "编辑业务信息", 1200);
    }
    function actInstallment(r) {
      openDialog("business_form", { mode: "installment", biz_uuid: r.biz_uuid }, "创建分期业务", 1200);
    }
    function actChangeMgr(r) {
      if (gated(r)) return;
      if (String(r.status) !== "3") {
        antd.message.warning("只有生效中的业务才能变更");
        return;
      }
      openDialog("manager_change", { biz_uuid: r.biz_uuid, updaterType: IS_MANAGER ? 1 : 0 }, "编辑业务所属客户经理", 600);
    }
    function actEdit(r) {
      if (gated(r)) return;
      if (String(r.status) !== "3" && String(r.status) !== "2") {
        antd.message.warning("只有生效中或新增审核失败的业务才能编辑");
        return;
      }
      if (String(r.status) === "2") {
        openDialog("business_form", { mode: "edit", biz_uuid: r.biz_uuid }, "编辑业务信息（重新申报）", 1200);
      } else {
        openDialog("business_look", { biz_uuid: r.biz_uuid, updaterType: IS_MANAGER ? 1 : 0 }, "编辑业务信息", 1200);
      }
    }
    function actStop(r) {
      if (gated(r)) return;
      if (String(r.status) === "4") {
        antd.message.warning("已过期的业务不允许中止");
        return;
      }
      Modal.confirm({
        title: "提示",
        content: "确认中止业务?",
        okText: "确定",
        cancelText: "取消",
        onOk: function() {
          CLIENT.call("226009", { businessId: r.biz_uuid, bondCode: r.bond_code, terminator: CUR_USER, updaterType: IS_MANAGER ? "1" : "0" }, function() {
            try {
              window.parent.FR.Msg.toast("中止业务流程审批中");
            } catch (e) {
            }
            reload(current, pageSize);
          }, null);
        }
      });
    }
    function actConfig() {
      openDialog("config", { id: 0 }, "配置计算参数", 700);
    }
    function actAdd() {
      openDialog("business_form", { mode: "add", biz_uuid: "" }, "新增业务信息", 1200);
    }
    function handlePageChange(page, size) {
      setCurrent(page);
      setPageSize(size);
      reload(page, size);
    }
    function handleSearch() {
      setCurrent(1);
      reload(1, pageSize);
    }
    function handleReset() {
      setCustName("");
      setBizName("");
      setStatus("");
      setCurrent(1);
      setTimeout(function() {
        reload(1, pageSize);
      }, 0);
    }
    React.useEffect(function() {
      function handler(e) {
        var d = e.data;
        if (!d) return;
        if (d.type === "fr_form_saved") {
          setModal({ open: false, url: "", title: "", width: 1e3 });
          reload(current, pageSize);
        }
        if (d.type === "fr_iframe_resize") {
          var f = document.getElementById("poolFrame");
          if (f) f.style.height = Math.max(300, Math.min(d.height + 20, 700)) + "px";
        }
      }
      window.addEventListener("message", handler);
      return function() {
        window.removeEventListener("message", handler);
      };
    }, [current, pageSize]);
    function expVal(r, k, dict) {
      var v = r[k];
      function ynNot(x) {
        return String(x) === "1" ? "是" : "不涉及";
      }
      if (dict === "ynNot") return ynNot(v);
      if (dict === "yn") return ynText(v);
      if (dict === "status") return statusText(v);
      if (DICTS[dict]) return dictText(DICTS[dict], v);
      return v === void 0 || v === null ? "" : String(v);
    }
    function handleExport() {
      setLoading(true);
      callData(IS_MANAGER ? "pool_list_all" : "pool_list_mine", listParams(1, 1e5), function(rows) {
        setLoading(false);
        if (!rows || !rows.length) {
          antd.message.warning("没有可导出的数据");
          return;
        }
        var cols = [
          ["债券编号或内部编号", "bond_code", null],
          ["ECIF客户编号", "ecif_customer_no", null],
          ["客户编号", "customer_no", null],
          ["融资人名称", "customer_name", null],
          ["项目/债券名称", "biz_name", null],
          ["标准/非标准", "bond_type", "bondType"],
          ["业务品种", "biz_type", "bizType"],
          ["是否绿色/科技/养老/不涉及", "green_tech_flag", "greenTech"],
          ["外部信用评级", "ext_rating", null],
          ["外部信用评级日期", "ext_rating_date", null],
          ["外部评级机构", "rating_agency", null],
          ["内部评级", "int_rating", null],
          ["内部评级日期", "int_rating_date", null],
          ["行业分类", "industry", "industry"],
          ["客户分类", "customer_type", "customerType"],
          ["是否我行预警客户", "alert_customer", "ynNot"],
          ["发放日/购买日", "start_date", null],
          ["到期日", "mature_date", null],
          ["币种", "currency", null],
          ["初始金额", "orig_amount", null],
          ["初始金额(折人民币)", "rmb_amount", null],
          ["业务余额(折人民币)", "balance", null],
          ["投资利率(%)", "invest_rate", null],
          ["价值转移利率(%)", "transfer_rate", null],
          ["担保情况", "guarantee_info", null],
          ["是否逾欠/违约", "breach_flag", "ynNot"],
          ["五级分类", "five_level_class", "fiveLevel"],
          ["是否涉及我行资金监管", "fund_used_flag", "ynNot"],
          ["我行监管资金是否已使用完毕", "fund_used_up", "ynNot"],
          ["是否涉及分期还款", "installment_flag", "ynNot"],
          ["还款计划", "installment_plan", null],
          ["是否我行承销", "our_bank_underwrite", "yn"],
          ["主承销商/联席主承销商", "lead_underwriter", null],
          ["所属管理条线", "manage_line", null],
          ["对应处室", "dept", "dept"],
          ["约定资金用途", "agreed_usage", null],
          ["是否有资金发放账户", "fund_account_flag", "ynNot"],
          ["资金发放/募集账户账号(我行)", "fund_account", null],
          ["是否有资金监管账户", "supervise_account_flag", "ynNot"],
          ["资金监管/回款专户账号(我行)", "supervise_account", null],
          ["是否原资产管理部回表业务", "is_original_am", "ynNot"],
          ["是否行权", "exercise_flag", "ynNot"],
          ["行权日期", "exercise_date", null],
          ["支用检查情况", "drawdown_check", null],
          ["批复号", "remark_number", null],
          ["批复管理要求", "remark", null],
          ["是否金融市场部批复管理要求", "js_remark_flag", "ynNot"],
          ["金融市场部批复管理要求", "js_remark", null],
          ["实地检查频率(月)", "inspect_freq", null],
          ["投后检查实施人员岗位", "inspector_post", null],
          ["客户经理", "related_name", null],
          ["业务发生机构", "org_name", null],
          ["业务状态", "status", "status"],
          ["是否有通道费", "is_passage", "ynNot"],
          ["通道费金额(%)", "passage_amount", null],
          ["上存利率(%)", "upper_storage_rate", null]
        ];
        var headers = ["序号"].concat(cols.map(function(c) {
          return c[0];
        }));
        var body = rows.map(function(r, i) {
          return [i + 1].concat(cols.map(function(c) {
            return expVal(r, c[1], c[2]);
          }));
        });
        downloadXlsx("金市业务_" + dayjs().format("YYYYMMDDHHmmss") + ".xlsx", headers, body);
      }, function() {
        setLoading(false);
      });
    }
    var actCols = [];
    if (!IS_MANAGER) {
      actCols.push({ key: "a1", label: "完善业务信息", show: function(r) {
        return String(r.status) === "0";
      }, fn: actComplete });
    }
    actCols.push({ key: "a2", label: "变更客户经理", show: function() {
      return true;
    }, fn: actChangeMgr });
    actCols.push({ key: "a3", label: "编辑", show: function() {
      return true;
    }, fn: actEdit });
    if (!IS_MANAGER) {
      actCols.push({ key: "a4", label: "创建分期", show: function() {
        return true;
      }, fn: actInstallment });
    }
    actCols.push({ key: "a5", label: "中止", show: function() {
      return true;
    }, fn: actStop });
    var COLS_KEY = "whjrscb_pool_colw_" + mode;
    var colWHook = React.useState(function() {
      try {
        return JSON.parse(window.localStorage.getItem(COLS_KEY) || "{}") || {};
      } catch (e) {
        return {};
      }
    });
    var colW = colWHook[0];
    var setColW = colWHook[1];
    var wrapHook = React.useState(0);
    var wrapW = wrapHook[0];
    var setWrapW = wrapHook[1];
    var wrapRef = React.useRef(null);
    React.useEffect(function() {
      var el = wrapRef.current;
      if (!el) return;
      function sync() {
        setWrapW(el.clientWidth);
      }
      sync();
      var ro = null;
      if (window.ResizeObserver) {
        ro = new ResizeObserver(sync);
        ro.observe(el);
      } else {
        window.addEventListener("resize", sync);
      }
      return function() {
        if (ro) ro.disconnect();
        else window.removeEventListener("resize", sync);
      };
    }, []);
    function rememberWidths(w) {
      try {
        window.localStorage.setItem(COLS_KEY, JSON.stringify(w));
      } catch (e) {
      }
    }
    function startResize(colKey, e) {
      e.preventDefault();
      e.stopPropagation();
      var startX = e.clientX;
      var th = e.currentTarget && e.currentTarget.closest ? e.currentTarget.closest("th") : null;
      var startW = th ? Math.round(th.getBoundingClientRect().width) : colW[colKey] || 100;
      function onMove(ev) {
        var w = Math.max(56, Math.round(startW + ev.clientX - startX));
        setColW(function(prev) {
          var n = Object.assign({}, prev);
          n[colKey] = w;
          return n;
        });
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.userSelect = "";
        setColW(function(prev) {
          rememberWidths(prev);
          return prev;
        });
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.userSelect = "none";
    }
    function ResizableHeader(props) {
      var onResize = props.onResize;
      var rest = {};
      Object.keys(props).forEach(function(k) {
        if (k !== "onResize") rest[k] = props[k];
      });
      rest.style = Object.assign({}, rest.style, { position: "relative" });
      if (!onResize) return React.createElement("th", rest, rest.children);
      return React.createElement(
        "th",
        rest,
        rest.children,
        React.createElement(
          "span",
          {
            key: "rz",
            style: {
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 8,
              cursor: "col-resize",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end"
            },
            onMouseDown: function(e) {
              onResize(e);
            }
          },
          React.createElement("span", { style: { width: 2, height: "55%", background: "#d9d9d9" } })
        )
      );
    }
    var BASE_COLS = [
      { title: "序号", key: "__idx", width: 60, render: function(_, __, i) {
        return (current - 1) * pageSize + i + 1;
      } },
      { title: "债券编号", key: "bond_code", dataIndex: "bond_code", width: 130 },
      { title: "ECIF客户编号", key: "ecif_customer_no", dataIndex: "ecif_customer_no", width: 120 },
      { title: "客户编号", key: "customer_no", dataIndex: "customer_no", width: 110 },
      { title: "融资人名称", key: "customer_name", dataIndex: "customer_name", width: 180, ellipsis: true },
      { title: "项目名称", key: "biz_name", dataIndex: "biz_name", width: 200, ellipsis: true },
      { title: "创建日期", key: "create_time", dataIndex: "create_time", width: 120, render: function(v) {
        return fmtDate(v);
      } },
      { title: "状态", key: "status", dataIndex: "status", width: 90, render: function(v) {
        return statusText(v);
      } }
    ];
    if (IS_MANAGER) {
      BASE_COLS.push({ title: "业务所属客户经理", key: "related_name", dataIndex: "related_name", width: 140, render: function(v) {
        return v || "";
      } });
      BASE_COLS.push({ title: "业务所属机构", key: "dept_name", dataIndex: "dept_name", width: 140, render: function(v) {
        return v || "";
      } });
    }
    BASE_COLS.push({
      title: "操作",
      key: "__act",
      width: IS_MANAGER ? 180 : 260,
      fixed: "right",
      render: function(_, r) {
        var btns = [];
        actCols.forEach(function(a) {
          if (!a.show(r)) return;
          btns.push(React.createElement(Button, {
            key: a.key,
            size: "small",
            type: "link",
            onClick: function() {
              a.fn(r);
            }
          }, a.label));
        });
        return React.createElement(Space, { size: 0 }, btns);
      }
    });
    var totalW = 0;
    var columns = BASE_COLS.map(function(c) {
      var w = colW[c.key] || c.width;
      totalW += w;
      return Object.assign({}, c, {
        width: w,
        onHeaderCell: function() {
          return { width: w, onResize: function(e) {
            startResize(c.key, e);
          } };
        }
      });
    });
    var spacer = Math.max(0, Math.round(wrapW - totalW));
    var tableCols = spacer > 1 ? columns.concat([{ title: "", key: "__spacer", width: spacer, render: function() {
      return "";
    } }]) : columns;
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "16px", background: "#f5f5f5", minHeight: "100vh" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", padding: "16px 24px", borderRadius: "8px" } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#888", marginBottom: 16 } }, "当前查询结果条数为：", total), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 16, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 } }, /* @__PURE__ */ React.createElement(Space, { wrap: true }, /* @__PURE__ */ React.createElement("span", null, "融资人名称:"), /* @__PURE__ */ React.createElement(
      Select,
      {
        showSearch: true,
        allowClear: true,
        placeholder: "全部",
        style: { width: 180 },
        value: custName || void 0,
        onChange: function(v) {
          setCustName(v || "");
        },
        options: custOpts,
        optionFilterProp: "label"
      }
    ), /* @__PURE__ */ React.createElement("span", null, "项目/债券名称:"), /* @__PURE__ */ React.createElement(
      Select,
      {
        showSearch: true,
        allowClear: true,
        placeholder: "全部",
        style: { width: 180 },
        value: bizName || void 0,
        onChange: function(v) {
          setBizName(v || "");
        },
        options: bizOpts,
        optionFilterProp: "label"
      }
    ), !IS_MANAGER && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "状态:"), /* @__PURE__ */ React.createElement(
      Select,
      {
        allowClear: true,
        placeholder: "全部",
        style: { width: 120 },
        value: status || void 0,
        onChange: function(v) {
          setStatus(v || "");
        },
        options: selOpts(DICTS.status)
      }
    )), /* @__PURE__ */ React.createElement(Button, { type: "primary", icon: icon("/outlined/search.svg"), onClick: handleSearch }, "查询"), /* @__PURE__ */ React.createElement(Button, { icon: icon("/outlined/reload.svg"), onClick: handleReset }, "重置"), !IS_MANAGER && /* @__PURE__ */ React.createElement(Button, { type: "primary", icon: icon("/outlined/plus.svg"), onClick: actAdd }, "新增业务")), /* @__PURE__ */ React.createElement(Space, null, /* @__PURE__ */ React.createElement(Button, { icon: icon("/outlined/export.svg"), onClick: handleExport }, "导出"), IS_MANAGER && /* @__PURE__ */ React.createElement(Button, { icon: icon("/outlined/setting.svg"), onClick: actConfig }, "配置上存利率计算参数"))), /* @__PURE__ */ React.createElement("div", { ref: wrapRef }, /* @__PURE__ */ React.createElement(
      Table,
      {
        rowKey: "id",
        loading,
        columns: tableCols,
        dataSource: data,
        size: "middle",
        components: { header: { cell: ResizableHeader } },
        scroll: { x: totalW + spacer, y: "calc(100vh - 320px)" },
        pagination: {
          current,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          showTotal: function(t) {
            return "共 " + t + " 条";
          },
          onChange: handlePageChange
        }
      }
    )), modal.open && /* @__PURE__ */ React.createElement(
      Modal,
      {
        title: modal.title,
        open: true,
        footer: null,
        width: modal.width,
        destroyOnClose: true,
        onCancel: function() {
          setModal({ open: false, url: "", title: "", width: 1e3 });
        },
        styles: { body: { padding: 0 } }
      },
      /* @__PURE__ */ React.createElement(
        "iframe",
        {
          id: "poolFrame",
          src: modal.url,
          style: { width: "100%", height: "560px", minHeight: "300px", maxHeight: "700px", border: "none" }
        }
      )
    )));
  }
  ReactDOM.createRoot(document.getElementById("app-root")).render(
    React.createElement(
      antd.ConfigProvider,
      { locale: zhCN },
      React.createElement(App)
    )
  );
})();
