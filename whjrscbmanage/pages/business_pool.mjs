(() => {
  // pages/business_pool.jsx
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
    industry: [{ v: "0", t: "货币金融服务" }, { v: "1", t: "资本市场服务" }, { v: "2", t: "保险业" }, { v: "3", t: "其他金融业" }],
    customerType: [{ v: "0", t: "一类" }, { v: "1", t: "二类" }, { v: "2", t: "三类" }, { v: "3", t: "四类" }],
    currency: [{ v: "人民币", t: "人民币" }, { v: "美元", t: "美元" }],
    guaranty: [{ v: "信用", t: "信用" }, { v: "保证", t: "保证" }, { v: "抵押", t: "抵押" }, { v: "质押", t: "质押" }],
    fiveLevel: ["正常一档", "正常二档", "正常三档", "关注", "次级", "可疑", "损失"],
    manageLine: [{ v: "金融市场部", t: "金融市场部" }],
    dept: [{ v: "利率室", t: "利率室" }, { v: "同业室", t: "同业室" }, { v: "托管室", t: "托管室" }],
    rating: ["AAA+", "AAA", "AAA-", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BB", "B", "CCC", "CC", "C"],
    exercise: [{ v: "0", t: "否" }, { v: "1", t: "是" }],
    bizType: [{ v: "0", t: "国债" }, { v: "1", t: "地方债" }, { v: "2", t: "金融债" }, { v: "3", t: "企业债" }, { v: "4", t: "中期票据" }, { v: "5", t: "短期融资券" }, { v: "6", t: "资产支持证券" }, { v: "7", t: "同业存单" }, { v: "8", t: "货币市场工具" }, { v: "9", t: "非标准化资产" }, { v: "10", t: "股权" }, { v: "11", t: "基金" }, { v: "12", t: "其他" }],
    status: [{ v: "0", t: "未完善" }, { v: "1", t: "审核中" }, { v: "2", t: "审核失败" }, { v: "3", t: "生效中" }, { v: "4", t: "已过期" }, { v: "5", t: "已中止" }],
    ynNot: [{ v: "0", t: "不涉及" }, { v: "1", t: "是" }]
  };
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
  function downloadCsv(filename, headers, rows) {
    var q = function(v) {
      var s = v === void 0 || v === null ? "" : String(v);
      return '"' + s.replace(/"/g, '""') + '"';
    };
    var lines = [headers.map(q).join(",")];
    rows.forEach(function(r) {
      lines.push(r.map(q).join(","));
    });
    var blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
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
  }
  function App() {
    var { Table, Button, Input, Select, Space, Modal } = antd;
    var [mode, setMode] = React.useState(function() {
      try {
        return new URLSearchParams(window.location.search).get("mode") || "view";
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
      openDialog("business_form", { mode: "edit", id: r.id }, "编辑业务信息", 1200);
    }
    function actInstallment(r) {
      openDialog("business_form", { mode: "installment", id: r.id }, "创建分期业务", 1200);
    }
    function actChangeMgr(r) {
      if (gated(r)) return;
      if (String(r.status) !== "3") {
        antd.message.warning("只有生效中的业务才能变更");
        return;
      }
      openDialog("manager_change", { id: r.id, updaterType: IS_MANAGER ? 1 : 0 }, "编辑业务所属客户经理", 600);
    }
    function actEdit(r) {
      if (gated(r)) return;
      if (String(r.status) !== "3") {
        antd.message.warning("只有生效中的业务才能编辑");
        return;
      }
      openDialog("business_look", { id: r.id, updaterType: IS_MANAGER ? 1 : 0 }, "编辑业务信息", 1200);
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
          CLIENT.call("226009", { bondCode: r.bond_code, terminator: CUR_USER, updaterType: IS_MANAGER ? "1" : "0" }, function() {
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
        downloadCsv("金市业务_" + dayjs().format("YYYYMMDDHHmmss") + ".csv", headers, body);
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
    var columns = [
      { title: "序号", key: "__idx", width: 60, render: function(_, __, i) {
        return (current - 1) * pageSize + i + 1;
      } },
      { title: "债券编号或内部编号", dataIndex: "bond_code", width: 130 },
      { title: "ECIF客户编号", dataIndex: "ecif_customer_no", width: 120 },
      { title: "客户编号", dataIndex: "customer_no", width: 110 },
      { title: "融资人名称", dataIndex: "customer_name", width: 180, ellipsis: true },
      { title: "项目/债券名称", dataIndex: "biz_name", width: 200, ellipsis: true },
      { title: "标准/非标准", dataIndex: "bond_type", width: 110, render: function(v) {
        return dictText(DICTS.bondType, v);
      } },
      { title: "状态", dataIndex: "status", width: 90, render: function(v) {
        return statusText(v);
      } },
      { title: "所属客户经理", dataIndex: "related_name", width: 140, render: function(v) {
        return v || "";
      } },
      { title: "所属机构", dataIndex: "dept_name", width: 140, render: function(v) {
        return v || "";
      } },
      { title: "创建时间", dataIndex: "create_time", width: 160, render: function(v) {
        return fmtDate(v);
      } },
      {
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
      }
    ];
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "16px", background: "#f5f5f5", minHeight: "100vh" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", padding: "16px 24px", borderRadius: "8px" } }, /* @__PURE__ */ React.createElement("h2", { style: { margin: "0 0 4px" } }, "金市业务", IS_MANAGER ? "（管理）" : ""), /* @__PURE__ */ React.createElement("div", { style: { color: "#888", marginBottom: 16 } }, "当前查询结果条数为：", total), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 16, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 } }, /* @__PURE__ */ React.createElement(Space, { wrap: true }, /* @__PURE__ */ React.createElement("span", null, "融资人名称:"), /* @__PURE__ */ React.createElement(Input, { onChange: function(e) {
      setCustName(e.target.value);
    }, value: custName, style: { width: 180 }, placeholder: "客户名称" }), /* @__PURE__ */ React.createElement("span", null, "项目/债券名称:"), /* @__PURE__ */ React.createElement(Input, { onChange: function(e) {
      setBizName(e.target.value);
    }, value: bizName, style: { width: 180 }, placeholder: "项目/债券名称" }), !IS_MANAGER && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "状态:"), /* @__PURE__ */ React.createElement(
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
    )), /* @__PURE__ */ React.createElement(Button, { type: "primary", icon: icon("/outlined/search.svg"), onClick: handleSearch }, "查询"), /* @__PURE__ */ React.createElement(Button, { icon: icon("/outlined/reload.svg"), onClick: handleReset }, "重置")), /* @__PURE__ */ React.createElement(Space, null, /* @__PURE__ */ React.createElement(Button, { icon: icon("/outlined/export.svg"), onClick: handleExport }, "导出"), IS_MANAGER && /* @__PURE__ */ React.createElement(Button, { icon: icon("/outlined/setting.svg"), onClick: actConfig }, "配置上存利率计算参数"))), /* @__PURE__ */ React.createElement(
      Table,
      {
        rowKey: "id",
        loading,
        columns,
        dataSource: data,
        size: "middle",
        scroll: { x: 1900, y: "calc(100vh - 320px)" },
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
    ), modal.open && /* @__PURE__ */ React.createElement(
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
