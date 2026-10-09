(() => {
  // pages/manager_change.jsx
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
    var { Form, Select, Button, Spin, Input } = antd;
    const [form] = Form.useForm();
    const [orgOpts, setOrgOpts] = React.useState([]);
    const [mgrOpts, setMgrOpts] = React.useState([]);
    const [saving, setSaving] = React.useState(false);
    const [businessId, setBusinessId] = React.useState("0");
    const [updaterType, setUpdaterType] = React.useState("0");
    React.useEffect(function() {
      var q = new URLSearchParams(window.location.search);
      setBusinessId(q.get("id") || "0");
      var ut = q.get("updaterType") || "0";
      setUpdaterType(ut);
      callData("org_options", [], function(rows) {
        setOrgOpts(rows.map(function(r) {
          return { value: r.dept_name, label: r.dept_name };
        }));
      }, null);
      callData("manager_options", [], function(rows) {
        setMgrOpts(rows.map(function(r) {
          return { value: r.name_with_id, label: r.name_with_id };
        }));
      }, null);
      setTimeout(notifyHeight, 50);
    }, []);
    function parseParen(v) {
      if (!v) return "";
      var m = String(v).match(/\(([^)]+)\)/);
      return m ? m[1].trim() : "";
    }
    function stripParen(v) {
      if (!v) return "";
      return String(v).replace(/\([^)]*\)/, "").trim();
    }
    function handleSubmit() {
      form.validateFields().then(function(values) {
        setSaving(true);
        CLIENT.call("226008", {
          businessId: String(businessId),
          creator: CUR_USER,
          newCreator: parseParen(values.person1),
          newOrgCode: parseParen(values.dept1),
          newOrgName: stripParen(values.dept1),
          updaterType
        }, function() {
          setSaving(false);
          try {
            window.parent.FR.Msg.toast("申请更改客户经理审批中");
          } catch (e) {
          }
          setTimeout(closeSelf, 300);
        }, function() {
          setSaving(false);
        });
      }).catch(function() {
      });
    }
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "20px 24px", paddingBottom: 24 } }, /* @__PURE__ */ React.createElement("h3", { style: { marginTop: 0, marginBottom: 16 } }, "编辑业务所属客户经理"), /* @__PURE__ */ React.createElement(Form, { form, layout: "vertical", autoComplete: "off" }, /* @__PURE__ */ React.createElement(Form.Item, { label: "归属机构", name: "dept1", rules: [{ required: true, message: "请选择归属机构" }] }, /* @__PURE__ */ React.createElement(Select, { placeholder: "请选择归属机构", options: orgOpts, showSearch: true, optionFilterProp: "label" })), /* @__PURE__ */ React.createElement(Form.Item, { label: "客户经理", name: "person1", rules: [{ required: true, message: "请选择客户经理" }] }, /* @__PURE__ */ React.createElement(Select, { placeholder: "请选择客户经理", options: mgrOpts, showSearch: true, optionFilterProp: "label" })), /* @__PURE__ */ React.createElement(Form.Item, { style: { marginBottom: 0, marginTop: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 } }, /* @__PURE__ */ React.createElement(Button, { onClick: closeSelf }, "取消"), /* @__PURE__ */ React.createElement(Button, { type: "primary", loading: saving, onClick: handleSubmit }, "变更申请")))));
  }
  ReactDOM.createRoot(document.getElementById("app-root")).render(
    React.createElement(
      antd.ConfigProvider,
      { locale: zhCN },
      React.createElement(App)
    )
  );
})();
