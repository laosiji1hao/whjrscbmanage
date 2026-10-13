(() => {
  // pages/business_look.jsx
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
  function selOpts(arr) {
    if (!arr) return [];
    return arr.map(function(o) {
      if (o && typeof o === "object" && "v" in o) {
        return { value: String(o.v), label: o.t === void 0 || o.t === null ? "" : String(o.t) };
      }
      return o;
    });
  }
  function padEcif(v) {
    var s = v === void 0 || v === null ? "" : String(v).trim();
    if (s === "") return "";
    if (!/^\d+$/.test(s)) return s;
    while (s.length < 17) s = "0" + s;
    return s;
  }
  function planFromStore(t) {
    var j = t === void 0 || t === null ? "" : String(t).trim();
    if (j && j.charAt(0) === "[") {
      try {
        var arr = JSON.parse(j);
        if (Array.isArray(arr)) {
          var s = arr.map(function(x) {
            return "还款时间:" + (x.installmentTime || x.repayment_date || "") + ",还款金额:" + (x.installmentAmount || x.repayment_amount || "");
          }).join(";");
          return { json: j, detail: s };
        }
      } catch (e) {
      }
    }
    return { json: j && j !== "[]" ? j : "", detail: j };
  }
  function notifyHeight() {
    try {
      if (window.parent === window) return;
      var el = document.getElementById("app-root");
      var h = el ? el.scrollHeight : document.body.scrollHeight;
      window.parent.postMessage({ type: "fr_iframe_resize", height: h }, "*");
    } catch (e) {
    }
  }
  function closeSelf() {
    try {
      if (window.parent !== window) window.parent.postMessage({ type: "fr_form_saved" }, "*");
    } catch (e) {
    }
  }
  function App() {
    var { Form, Input, InputNumber, Select, Button, Space, Row, Col, Spin, Modal, DatePicker, Tooltip } = antd;
    const [form] = Form.useForm();
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [recordId, setRecordId] = React.useState("0");
    const [updaterType, setUpdaterType] = React.useState("0");
    const [cfg, setCfg] = React.useState({ coupon_rate: 0, vat: 0, surcharge: 0 });
    const [instDetail, setInstDetail] = React.useState("");
    const [instJson, setInstJson] = React.useState("");
    const [showPassage, setShowPassage] = React.useState(false);
    const [showFund, setShowFund] = React.useState(false);
    const [showSuper, setShowSuper] = React.useState(false);
    const [showJs, setShowJs] = React.useState(false);
    const [showExDate, setShowExDate] = React.useState(false);
    const [showInstall, setShowInstall] = React.useState(false);
    const [planModal, setPlanModal] = React.useState({ open: false, url: "" });
    const loadingRef = React.useRef(false);
    var cfgRef = { coupon_rate: 0, vat: 0, surcharge: 0, ready: false };
    var needUpperInit = false;
    function initUpperWhenReady() {
      if (cfgRef.ready && needUpperInit) {
        needUpperInit = false;
        form.setFieldsValue({ upper_storage_rate: six(num(cfgRef.coupon_rate) - num(cfgRef.vat) - num(cfgRef.surcharge)) });
      }
    }
    function outtext(v) {
      return v === void 0 || v === null ? "" : String(v);
    }
    function pickDay(v) {
      if (!v) return null;
      var d = dayjs(String(v).slice(0, 10));
      return d.isValid() ? d : null;
    }
    function num(v) {
      if (v === void 0 || v === null || v === "") return null;
      var n = Number(v);
      return isNaN(n) ? null : n;
    }
    function six(n) {
      if (n === void 0 || n === null || n === "" || isNaN(Number(n))) return null;
      return parseFloat(Number(n).toFixed(6));
    }
    function convertAmount(currency, amt) {
      if (amt === null || amt === void 0 || amt === "") return null;
      var val = Number(amt);
      if (isNaN(val)) return null;
      if (String(currency) === "美元") return Number((val * 6.8).toFixed(2));
      return Number(val.toFixed(2));
    }
    React.useEffect(function() {
      var q = new URLSearchParams(window.location.search);
      var id = q.get("biz_uuid") || "";
      setRecordId(id);
      setUpdaterType(q.get("updaterType") || "0");
      loadingRef.current = true;
      callData("config_get", [], function(rows) {
        if (rows && rows.length) {
          var c = rows[0];
          cfgRef.coupon_rate = num(c.coupon_rate) || 0;
          cfgRef.vat = num(c.vat) || 0;
          cfgRef.surcharge = num(c.surcharge) || 0;
          cfgRef.ready = true;
          setCfg({ coupon_rate: cfgRef.coupon_rate, vat: cfgRef.vat, surcharge: cfgRef.surcharge });
          initUpperWhenReady();
        }
      }, null);
      if (id && id !== "0") {
        callData("get_business", [{ name: "p_biz_uuid", type: "String", value: id }], function(rows) {
          loadingRef.current = false;
          setLoading(false);
          if (!rows || !rows.length) {
            antd.message.error("记录不存在");
            return;
          }
          var d = rows[0];
          form.setFieldsValue({
            id: d.id,
            bond_type: d.bond_type,
            customer_no: d.customer_no,
            ecif_customer_no: d.ecif_customer_no,
            customer_name: d.customer_name,
            biz_name: d.biz_name,
            bond_code: d.bond_code,
            green_tech_flag: d.green_tech_flag,
            ext_rating: d.ext_rating,
            ext_rating_date: pickDay(d.ext_rating_date),
            rating_agency: d.rating_agency,
            int_rating: d.int_rating,
            int_rating_date: pickDay(d.int_rating_date),
            lead_underwriter: d.lead_underwriter,
            industry: d.industry,
            customer_type: d.customer_type,
            alert_customer: d.alert_customer,
            biz_type: d.biz_type,
            start_date: pickDay(d.start_date),
            mature_date: pickDay(d.mature_date),
            currency: d.currency,
            orig_amount: num(d.orig_amount),
            rmb_amount: num(d.rmb_amount),
            balance: num(d.balance),
            invest_rate: num(d.invest_rate),
            transfer_rate: num(d.transfer_rate),
            guarantee_info: d.guarantee_info,
            breach_flag: d.breach_flag,
            five_level_class: d.five_level_class,
            installment_flag: d.installment_flag,
            our_bank_underwrite: d.our_bank_underwrite,
            agreed_usage: d.agreed_usage,
            manage_line: d.manage_line,
            dept: d.dept,
            fund_account_flag: d.fund_account_flag,
            fund_account: d.fund_account,
            supervise_account_flag: d.supervise_account_flag,
            supervise_account: d.supervise_account,
            fund_used_flag: d.fund_used_flag,
            fund_used_up: d.fund_used_up,
            drawdown_check: d.drawdown_check,
            remark_number: d.remark_number,
            remark: d.remark,
            js_remark_flag: d.js_remark_flag,
            js_remark: d.js_remark,
            inspect_freq: d.inspect_freq,
            is_original_am: d.is_original_am,
            exercise_flag: d.exercise_flag,
            exercise_date: pickDay(d.exercise_date),
            creator: d.creator,
            org_name: d.org_name,
            inspector_post: d.inspector_post,
            is_passage: outtext(d.is_passage),
            passage_amount: num(d.passage_amount),
            upper_storage_rate: num(d.upper_storage_rate)
          });
          setShowFund(String(d.fund_account_flag || "0") === "1");
          setShowSuper(String(d.supervise_account_flag || "0") === "1");
          setShowJs(String(d.js_remark_flag || "0") === "1");
          setShowExDate(String(d.exercise_flag || "0") === "1");
          setShowInstall(String(d.installment_flag || "0") === "1");
          setShowPassage(String(d.is_passage || "0") === "1");
          if (String(d.is_passage || "0") !== "1") {
            needUpperInit = true;
            initUpperWhenReady();
          }
          var pl = planFromStore(d.installment_plan);
          setInstJson(pl.json);
          setInstDetail(pl.detail);
        });
      } else {
        loadingRef.current = false;
        setLoading(false);
      }
      setTimeout(notifyHeight, 50);
    }, []);
    React.useEffect(function() {
      notifyHeight();
    });
    React.useEffect(function() {
      function handler(e) {
        var d = e.data;
        if (!d) return;
        if (d.type === "fr_inst_plan") {
          setPlanModal({ open: false, url: "" });
          setInstDetail(d.result || "");
          setInstJson(d.json || "[]");
        } else if (d.type === "fr_form_saved") {
          setPlanModal({ open: false, url: "" });
        }
      }
      window.addEventListener("message", handler);
      return function() {
        window.removeEventListener("message", handler);
      };
    }, []);
    function recalcRate(isPassage, passage) {
      var rate = null;
      if (String(isPassage) !== "1") {
        rate = six(num(cfg.coupon_rate) - num(cfg.vat) - num(cfg.surcharge));
      } else {
        var ir = num(form.getFieldValue("invest_rate"));
        rate = six(ir - num(cfg.vat) - num(cfg.surcharge) - num(passage));
      }
      form.setFieldsValue({ upper_storage_rate: rate });
    }
    function openPlan() {
      var flag = form.getFieldValue("installment_flag");
      if (String(flag) !== "1") {
        antd.message.warning("分期还款请选择是！");
        return;
      }
      var bc = outtext(form.getFieldValue("bond_code"));
      setPlanModal({
        open: true,
        url: PATH.apiBase + "/view/report?op=write&viewlet=" + PATH.getTemplatePath("installment_ment.cpt") + "&bond_code=" + encodeURIComponent(bc) + "&type=1&initial=" + encodeURIComponent(instJson)
      });
    }
    function ecifQuery(custNo) {
      if (!custNo) return;
      CLIENT.call("226010", { custNo: outtext(custNo) }, function(data) {
        var f = data || {};
        var curE = outtext(form.getFieldValue("ecif_customer_no"));
        var curN = outtext(form.getFieldValue("customer_name"));
        var ne = f.ecifCustomerNo === void 0 || f.ecifCustomerNo === null ? "" : String(f.ecifCustomerNo);
        var nn = f.customerName === void 0 || f.customerName === null ? "" : String(f.customerName);
        if (ne === "") {
          if (curE !== "") antd.message.warning("该客户编号查询的ECIF客户号不存在");
        } else if (curE !== "" && curE !== ne) {
          antd.Modal.confirm({
            title: "提示",
            content: "ECIF客户号已在页面上填写为【" + curE + "】，与查询结果【" + ne + "】不一致，是否以此为准？",
            okText: "确定",
            cancelText: "取消",
            onOk: function() {
              form.setFieldsValue({ ecif_customer_no: ne });
            }
          });
        } else {
          form.setFieldsValue({ ecif_customer_no: ne });
        }
        if (nn === "") {
          if (curN !== "") antd.message.warning("该客户编号查询的客户名称不存在");
        } else if (curN !== "" && curN !== nn) {
          antd.Modal.confirm({
            title: "提示",
            content: "客户名称已在页面上填写为【" + curN + "】，与查询结果【" + nn + "】不一致，是否以此为准？",
            okText: "确定",
            cancelText: "取消",
            onOk: function() {
              form.setFieldsValue({ customer_name: nn });
            }
          });
        } else {
          form.setFieldsValue({ customer_name: nn });
        }
      }, null);
    }
    function checkAccount(name, acct) {
      if (!acct) return;
      CLIENT.call("226014", { acctNo: outtext(acct) }, function(data) {
        if (data && data.status !== "AS00") {
          antd.message.warning("该账号不可用，查询结果为" + (data.statusTxt || data.status));
          form.setFieldsValue({ [name]: "" });
        }
      }, function() {
        form.setFieldsValue({ [name]: "" });
      });
    }
    function handleSubmit() {
      form.validateFields().then(function(values) {
        var ct = outtext(values.customer_type);
        var inspectFreq = ct === "0" || ct === "1" ? 3 : 1;
        var body = {
          businessId: outtext(recordId),
          bondCode: outtext(values.bond_code),
          ecifCustomerNo: outtext(values.ecif_customer_no),
          customerNo: outtext(values.customer_no),
          customerName: outtext(values.customer_name),
          bizName: outtext(values.biz_name),
          bondType: outtext(values.bond_type),
          bizType: outtext(values.biz_type),
          greenTechFlag: outtext(values.green_tech_flag),
          extRating: outtext(values.ext_rating),
          extRatingDate: values.ext_rating_date ? dayjs(values.ext_rating_date).format("YYYY-MM-DD") : "",
          ratingAgency: outtext(values.rating_agency),
          intRating: outtext(values.int_rating),
          intRatingDate: values.int_rating_date ? dayjs(values.int_rating_date).format("YYYY-MM-DD") : "",
          industry: outtext(values.industry),
          customerType: ct,
          alertCustomer: outtext(values.alert_customer),
          startDate: values.start_date ? dayjs(values.start_date).format("YYYY-MM-DD") : "",
          matureDate: values.mature_date ? dayjs(values.mature_date).format("YYYY-MM-DD") : "",
          currency: outtext(values.currency),
          origAmount: values.orig_amount === null || values.orig_amount === void 0 ? "" : String(values.orig_amount),
          rmbAmount: values.rmb_amount === null || values.rmb_amount === void 0 ? "" : String(values.rmb_amount),
          balance: values.balance === null || values.balance === void 0 ? "" : String(values.balance),
          investRate: values.invest_rate === null || values.invest_rate === void 0 ? "" : String(values.invest_rate),
          transferRate: values.transfer_rate === null || values.transfer_rate === void 0 ? "" : String(values.transfer_rate),
          guaranteeInfo: outtext(values.guarantee_info),
          breachFlag: outtext(values.breach_flag),
          fiveLevelClass: outtext(values.five_level_class),
          fundUsedFlag: outtext(values.fund_used_flag),
          fundUsedUp: outtext(values.fund_used_up),
          installmentFlag: outtext(values.installment_flag),
          installment: instJson || "",
          ourBankUnderwrite: outtext(values.our_bank_underwrite),
          manageLine: outtext(values.manage_line),
          dept: outtext(values.dept),
          agreedUsage: outtext(values.agreed_usage),
          fundAccount: outtext(values.fund_account),
          fundAccountFlag: outtext(values.fund_account_flag),
          superviseAccount: outtext(values.supervise_account),
          superviseAccountFlag: outtext(values.supervise_account_flag),
          drawdownCheck: outtext(values.drawdown_check),
          isOriginalAm: outtext(values.is_original_am),
          exerciseFlag: outtext(values.exercise_flag),
          exerciseDate: values.exercise_date ? dayjs(values.exercise_date).format("YYYY-MM-DD") : "",
          remark: outtext(values.remark),
          remarkNumber: outtext(values.remark_number),
          jsRemark: outtext(values.js_remark),
          jsRemarkFlag: outtext(values.js_remark_flag),
          inspectFreq: String(inspectFreq),
          inspectorPost: outtext(values.inspector_post),
          leadUnderwriter: outtext(values.lead_underwriter),
          isPassage: outtext(values.is_passage),
          passageAmount: values.passage_amount === null || values.passage_amount === void 0 ? "" : String(values.passage_amount),
          upperStorageRate: values.upper_storage_rate === null || values.upper_storage_rate === void 0 ? "" : String(values.upper_storage_rate),
          updaterType
        };
        setSaving(true);
        CLIENT.call("226007", body, function() {
          setSaving(false);
          try {
            window.parent.FR.closeDialog();
            window.parent.contentPane && window.parent.contentPane.parameterCommit();
            window.parent.FR.Msg.toast("申请变更业务信息审批中");
          } catch (e) {
          }
          setTimeout(closeSelf, 300);
        }, function() {
          setSaving(false);
        });
      }).catch(function() {
      });
    }
    var sel = function(opts, placeholder) {
      return { style: { width: "100%" }, placeholder: placeholder || "请选择", options: selOpts(opts) };
    };
    var readOnlySpanStyle = { display: "inline-block", paddingTop: 5 };
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 24px", paddingBottom: 16 } }, /* @__PURE__ */ React.createElement(Spin, { spinning: loading }, /* @__PURE__ */ React.createElement(
      Form,
      {
        form,
        layout: "vertical",
        autoComplete: "off",
        onValuesChange: function(changed) {
          if (loadingRef.current) return;
          if (changed.installment_flag !== void 0) {
            setShowInstall(String(changed.installment_flag) === "1");
            if (String(changed.installment_flag) !== "1") {
              setInstDetail("");
              setInstJson("");
            }
          }
          if (changed.orig_amount !== void 0 || changed.currency !== void 0) {
            var amt2 = changed.orig_amount !== void 0 ? changed.orig_amount : form.getFieldValue("orig_amount");
            var cur2 = changed.currency !== void 0 ? changed.currency : form.getFieldValue("currency");
            form.setFieldsValue({ rmb_amount: convertAmount(cur2, amt2) });
          }
          if (changed.is_passage !== void 0) {
            var pv = String(changed.is_passage);
            setShowPassage(pv === "1");
            if (pv !== "1") form.setFieldsValue({ passage_amount: null });
            recalcRate(pv, pv === "1" ? form.getFieldValue("passage_amount") : null);
          }
          if (changed.passage_amount !== void 0 || changed.invest_rate !== void 0) {
            if (String(form.getFieldValue("is_passage")) === "1") recalcRate("1", changed.passage_amount !== void 0 ? changed.passage_amount : form.getFieldValue("passage_amount"));
          }
          if (changed.int_rating !== void 0) {
            var c1 = ["AAA+", "AAA", "AAA-"];
            var c2 = ["AA+", "AA", "AA-", "A+", "A", "A-", "BBB+"];
            var r = String(changed.int_rating);
            if (c1.indexOf(r) !== -1) form.setFieldsValue({ customer_type: "0" });
            else if (c2.indexOf(r) !== -1) form.setFieldsValue({ customer_type: "1" });
          }
          if (changed.fund_account_flag !== void 0) {
            setShowFund(String(changed.fund_account_flag) === "1");
          }
          if (changed.supervise_account_flag !== void 0) {
            var sv = String(changed.supervise_account_flag);
            setShowSuper(sv === "1");
            form.setFieldsValue({ fund_used_flag: sv === "1" ? "1" : "0" });
          }
          if (changed.js_remark_flag !== void 0) setShowJs(String(changed.js_remark_flag) === "1");
          if (changed.exercise_flag !== void 0) {
            var ev = String(changed.exercise_flag);
            setShowExDate(ev === "1");
            if (ev === "1") form.setFieldsValue({ exercise_date: form.getFieldValue("mature_date") });
            else form.setFieldsValue({ exercise_date: null });
          }
          setTimeout(notifyHeight, 50);
        }
      },
      /* @__PURE__ */ React.createElement(Row, { gutter: 16 }, /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "标准/非标准业务", name: "bond_type", rules: [{ required: true, message: "请选择" }] }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.symbolStandard) }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: /* @__PURE__ */ React.createElement("span", null, "客户编号", /* @__PURE__ */ React.createElement(Tooltip, { title: "填写信贷系统客户编号，个人以P开头，企业以C开头" }, /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 4, color: "#faad14", cursor: "help" } }, icon("/outlined/exclamation-circle.svg")))), name: "customer_no", rules: [{ required: true, message: "请输入" }] }, /* @__PURE__ */ React.createElement(Input, { placeholder: "客户编号（失焦自动查ECIF）", onBlur: function(e) {
        ecifQuery(e.target.value);
      } }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "ECIF客户号", name: "ecif_customer_no" }, /* @__PURE__ */ React.createElement(Input, { placeholder: "填后 17 位，失焦自动补零", onBlur: function(e) {
        form.setFieldsValue({ ecif_customer_no: padEcif(e.target.value) });
      } }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "融资人名称", name: "customer_name", rules: [{ required: true, message: "请输入" }] }, /* @__PURE__ */ React.createElement(Input, null))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "项目/债券名称", name: "biz_name" }, /* @__PURE__ */ React.createElement(Input, null))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "债券编号", name: "bond_code" }, /* @__PURE__ */ React.createElement(Input, null))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "是否绿色/科技/养老/不涉及", name: "green_tech_flag", rules: [{ required: true, message: "请选择" }] }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.greenTech) }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "外部信用评级", name: "ext_rating", rules: [{ required: true, message: "请选择" }] }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.rating.map(function(x) {
        return { v: x, t: x };
      })) }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "外部信用评级日期", name: "ext_rating_date", rules: [{ required: true, message: "请选择" }] }, /* @__PURE__ */ React.createElement(DatePicker, { style: { width: "100%" }, placeholder: "请选择日期" }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "外部评级机构", name: "rating_agency" }, /* @__PURE__ */ React.createElement(Input, null))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "内部评级", name: "int_rating", rules: [{ required: true, message: "请选择" }] }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.rating.map(function(x) {
        return { v: x, t: x };
      })) }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "内部评级日期", name: "int_rating_date", rules: [{ required: true, message: "请选择" }] }, /* @__PURE__ */ React.createElement(DatePicker, { style: { width: "100%" }, placeholder: "请选择日期" }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "主承销商", name: "lead_underwriter" }, /* @__PURE__ */ React.createElement(Input, null))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "是否有通道费", name: "is_passage" }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.yn) }))), showPassage && /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "通道费金额(%)", name: "passage_amount" }, /* @__PURE__ */ React.createElement(InputNumber, { style: { width: "100%" }, precision: 6 }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "上存利率(%)", name: "upper_storage_rate", rules: [{ required: true, message: "请输入" }] }, /* @__PURE__ */ React.createElement(InputNumber, { style: { width: "100%" }, precision: 6 }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "行业分类", name: "industry", rules: [{ required: true, message: "请选择" }] }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.industry) }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "客户分类", name: "customer_type" }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.customerType) }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "是否我行预警客户", name: "alert_customer" }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.yn) }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "业务品种", name: "biz_type" }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.bizType) }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "发放日", name: "start_date", rules: [{ required: true, message: "请选择" }] }, /* @__PURE__ */ React.createElement(DatePicker, { style: { width: "100%" }, placeholder: "请选择日期" }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "到期日", name: "mature_date" }, /* @__PURE__ */ React.createElement(DatePicker, { style: { width: "100%" }, placeholder: "请选择日期" }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "币种", name: "currency", rules: [{ required: true, message: "请选择" }] }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.currency) }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "初始金额", name: "orig_amount", rules: [{ required: true, message: "请输入" }] }, /* @__PURE__ */ React.createElement(InputNumber, { style: { width: "100%" }, precision: 2 }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "初始金额（折人民币）", name: "rmb_amount" }, /* @__PURE__ */ React.createElement(InputNumber, { style: { width: "100%" }, precision: 2 }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "业务余额（折人民币）", name: "balance" }, /* @__PURE__ */ React.createElement(InputNumber, { style: { width: "100%" }, precision: 2 }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "投资利率（%）", name: "invest_rate" }, /* @__PURE__ */ React.createElement(InputNumber, { style: { width: "100%" }, precision: 2 }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "价值转移利率（%）", name: "transfer_rate" }, /* @__PURE__ */ React.createElement(InputNumber, { style: { width: "100%" }, precision: 2 }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "担保情况", name: "guarantee_info" }, /* @__PURE__ */ React.createElement(Input, null))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "是否逾欠/违约", name: "breach_flag" }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.yn) }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "五级分类", name: "five_level_class" }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.fiveLevel.map(function(x) {
        return { v: x, t: x };
      })) }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "是否涉及分期还款", name: "installment_flag" }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.yn) }))), showInstall && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "还款计划" }, /* @__PURE__ */ React.createElement(Button, { icon: icon("/outlined/plus.svg"), onClick: openPlan }, "添加还款计划"))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "还款计划明细" }, /* @__PURE__ */ React.createElement(Input.TextArea, { disabled: true, autoSize: { minRows: 2, maxRows: 4 }, value: instDetail })))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "是否我行承销", name: "our_bank_underwrite" }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.yn) }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "约定资金用途", name: "agreed_usage", rules: [{ required: true, message: "请输入" }] }, /* @__PURE__ */ React.createElement(Input, null))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "所属管理条线", name: "manage_line" }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.manageLine) }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "对应处室", name: "dept" }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.dept) }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "是否存在资金发放/募集账户账号", name: "fund_account_flag" }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.yn) }))), showFund && /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "资金发放/募集账户账号", name: "fund_account", rules: [{ required: true, message: "账号不允许为空" }] }, /* @__PURE__ */ React.createElement(Input, { placeholder: "失焦校验账号可用性", onBlur: function(e) {
        checkAccount("fund_account", e.target.value);
      } }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "是否存在资金监管/回款专户账号", name: "supervise_account_flag" }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.yn) }))), showSuper && /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "资金监管/回款专户账号", name: "supervise_account", rules: [{ required: true, message: "账号不允许为空" }] }, /* @__PURE__ */ React.createElement(Input, { placeholder: "失焦校验账号可用性", onBlur: function(e) {
        checkAccount("supervise_account", e.target.value);
      } }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "是否涉及我行资金监管", name: "fund_used_flag" }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.yn) }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "我行监管资金是否已使用完毕", name: "fund_used_up" }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.yn) }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "支用检查情况", name: "drawdown_check" }, /* @__PURE__ */ React.createElement(Input, { disabled: true, style: { background: "#f5f5f5" } }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "批复号", name: "remark_number" }, /* @__PURE__ */ React.createElement(Input, null))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "批复管理要求", name: "remark" }, /* @__PURE__ */ React.createElement(Input.TextArea, { autoSize: { minRows: 2, maxRows: 4 } }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "是否存在金融市场部批复管理要求", name: "js_remark_flag" }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.yn) }))), showJs && /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "金融市场部批复管理要求", name: "js_remark", rules: [{ required: true, message: "金融市场部批复管理要求不允许为空" }] }, /* @__PURE__ */ React.createElement(Input.TextArea, { autoSize: { minRows: 2, maxRows: 4 } }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "实地检查频率（月）", name: "inspect_freq" }, /* @__PURE__ */ React.createElement(Input, null))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "是否原资产管理部回表业务", name: "is_original_am" }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.yn) }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "是否行权", name: "exercise_flag" }, /* @__PURE__ */ React.createElement(Select, { ...sel(DICTS.exercise) }))), showExDate && /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "行权日期", name: "exercise_date" }, /* @__PURE__ */ React.createElement(DatePicker, { style: { width: "100%" }, placeholder: "请选择日期" }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "所属客户经理", name: "creator" }, /* @__PURE__ */ React.createElement(Input, { disabled: true, style: { background: "#f5f5f5" } }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "所属机构", name: "org_name" }, /* @__PURE__ */ React.createElement(Input, { disabled: true, style: { background: "#f5f5f5" } }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "投后检查实施人员岗位", name: "inspector_post" }, /* @__PURE__ */ React.createElement(Input, null)))),
      /* @__PURE__ */ React.createElement(Form.Item, { style: { marginBottom: 0, marginTop: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 } }, /* @__PURE__ */ React.createElement(Button, { onClick: closeSelf }, "取消"), /* @__PURE__ */ React.createElement(Button, { type: "primary", loading: saving, onClick: handleSubmit }, "确定")))
    )), planModal.open && /* @__PURE__ */ React.createElement(
      Modal,
      {
        title: "还款计划",
        open: true,
        footer: null,
        width: 640,
        destroyOnClose: true,
        onCancel: function() {
          setPlanModal({ open: false, url: "" });
        },
        styles: { body: { padding: 0 } }
      },
      /* @__PURE__ */ React.createElement(
        "iframe",
        {
          id: "planFrame2",
          src: planModal.url,
          style: { width: "100%", height: "420px", border: "none" }
        }
      )
    ));
  }
  ReactDOM.createRoot(document.getElementById("app-root")).render(
    React.createElement(
      antd.ConfigProvider,
      { locale: zhCN },
      React.createElement(App)
    )
  );
})();
