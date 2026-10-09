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
  hideStyle.innerHTML = ".fr-report{position:absolute!important;left:-9999px!important;visibility:hidden!important}.content-container,.fr-content,.reportPane{height:0!important;overflow:hidden!important;pointer-events:none!important}body>.textbox-container,body>#textboxContainer,body>.widget-container{display:none!important}";
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
    DatePicker: { placeholder: "请选择日期", rangePlaceholder: ["开始日期", "结束日期"] },
    Select: { placeholder: "请选择" }
  };
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
      "user"
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
        });
      }).catch(function() {
      });
    }
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "20px 24px", paddingBottom: 20 } }, /* @__PURE__ */ React.createElement("h3", { style: { marginTop: 0, marginBottom: 16 } }, "上存利率计算参数配置"), /* @__PURE__ */ React.createElement(Spin, { spinning: loading }, /* @__PURE__ */ React.createElement(Form, { form, layout: "vertical", autoComplete: "off" }, /* @__PURE__ */ React.createElement(Row, { gutter: 16 }, /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "票面利率（年化）", name: "coupon_rate" }, /* @__PURE__ */ React.createElement(Input, { disabled: true, style: { background: "#f5f5f5" } }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "增值税", name: "vat", rules: [{ required: true, message: "请输入增值税" }] }, /* @__PURE__ */ React.createElement(InputNumber, { style: { width: "100%" }, min: 0, max: 100, step: 1e-3, placeholder: "如 0.06" }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "附加税", name: "surcharge", rules: [{ required: true, message: "请输入附加税" }] }, /* @__PURE__ */ React.createElement(InputNumber, { style: { width: "100%" }, min: 0, max: 100, step: 1e-3, placeholder: "如 0.012" }))), /* @__PURE__ */ React.createElement(Col, { span: 12 }, /* @__PURE__ */ React.createElement(Form.Item, { label: "最后修改人" }, /* @__PURE__ */ React.createElement(Input, { value: CUR_USER, disabled: true, style: { background: "#f5f5f5" } })))), /* @__PURE__ */ React.createElement(Form.Item, { style: { marginBottom: 0, marginTop: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 } }, /* @__PURE__ */ React.createElement(Button, { onClick: closeSelf }, "取消"), /* @__PURE__ */ React.createElement(Button, { type: "primary", loading: saving, onClick: handleSubmit }, "保存"))))));
  }
  ReactDOM.createRoot(document.getElementById("app-root")).render(
    React.createElement(
      antd.ConfigProvider,
      { locale: zhCN },
      React.createElement(App)
    )
  );
})();
