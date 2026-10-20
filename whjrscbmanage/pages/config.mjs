(() => {
  // pages/config.jsx
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
  function spOk(rows) {
    if (!rows || !rows.length) return true;
    var v = rows[0].result !== void 0 ? rows[0].result : rows[0];
    if (typeof v === "string") {
      try {
        v = JSON.parse(v);
      } catch (e) {
        return true;
      }
    }
    if (v && typeof v === "object" && v.success === false) {
      antd.message.error(v.message || "操作失败");
      return false;
    }
    if (v && typeof v === "object" && v.message) {
      antd.message.success(v.message);
    }
    return true;
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
  function notifyHeight() {
    try {
      if (window.parent === window) return;
      var el = document.getElementById("app-root");
      var h = el ? el.scrollHeight : document.body.scrollHeight;
      window.parent.postMessage({ type: "fr_iframe_resize", height: h }, "*");
    } catch (e) {
    }
  }
  function closeSelf(msg) {
    try {
      if (window.parent !== window) window.parent.postMessage({ type: "fr_form_saved", msg: msg || "" }, "*");
    } catch (e) {
    }
  }
  function App() {
    var { Form, InputNumber, Button, Row, Col, Spin, Input } = antd;
    const [form] = Form.useForm();
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    React.useEffect(function() {
      setLoading(true);
      callData("config_get", [], function(rows) {
        setLoading(false);
        if (rows && rows.length) {
          form.setFieldsValue({
            id: rows[0].id,
            coupon_rate: rows[0].coupon_rate,
            vat: rows[0].vat,
            surcharge: rows[0].surcharge
          });
        }
      }, function() {
        setLoading(false);
      });
      setTimeout(notifyHeight, 50);
    }, []);
    function handleSubmit() {
      form.validateFields().then(function(values) {
        var id = form.getFieldValue("id");
        if (id === void 0 || id === null || id === "") {
          antd.message.warning("配置记录不存在，无法保存");
          return;
        }
        setSaving(true);
        callData("upper_config_update", [
          { name: "p_id", type: "String", value: String(id) },
          { name: "p_vat", type: "String", value: values.vat === void 0 || values.vat === null ? "" : String(values.vat) },
          { name: "p_surcharge", type: "String", value: values.surcharge === void 0 || values.surcharge === null ? "" : String(values.surcharge) },
          { name: "p_updater", type: "String", value: CUR_USER }
        ], function(rows) {
          setSaving(false);
          if (spOk(rows)) {
            setTimeout(closeSelf, 300);
          }
        }, function() {
          setSaving(false);
          antd.message.error("保存失败，请重试");
        });
      }).catch(function() {
      });
    }
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "20px 24px", paddingBottom: 20 } }, /* @__PURE__ */ React.createElement(Spin, { spinning: loading }, /* @__PURE__ */ React.createElement(Form, { form, layout: "vertical", autoComplete: "off" }, /* @__PURE__ */ React.createElement(Row, { gutter: 16 }, /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "增值税(%)", name: "vat", rules: [{ required: true, message: "请输入增值税" }] }, /* @__PURE__ */ React.createElement(InputNumber, { style: { width: "100%" }, min: 0, max: 100, step: 1e-3, placeholder: "如 0.06", suffix: "%" }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "附加税(%)", name: "surcharge", rules: [{ required: true, message: "请输入附加税" }] }, /* @__PURE__ */ React.createElement(InputNumber, { style: { width: "100%" }, min: 0, max: 100, step: 1e-3, placeholder: "如 0.012", suffix: "%" })))), /* @__PURE__ */ React.createElement(Form.Item, { style: { marginBottom: 0, marginTop: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 } }, /* @__PURE__ */ React.createElement(Button, { onClick: closeSelf }, "取消"), /* @__PURE__ */ React.createElement(Button, { type: "primary", loading: saving, onClick: handleSubmit }, "保存"))))));
  }
  ReactDOM.createRoot(document.getElementById("app-root")).render(
    React.createElement(
      antd.ConfigProvider,
      { locale: zhCN },
      React.createElement(App)
    )
  );
})();
