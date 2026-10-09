# SPEC — 更换客户经理 + 通道费计算配置 页面规格（fr-flow-v3 重构用）

> 来源文件（UTF-8，FineReport 11.5.0）：
> - `E:\wh_projects\whjrscbmanage\whjrscbmanage\front\my_business_pc_newmanager.cpt`
> - `E:\wh_projects\whjrscbmanage\whjrscbmanage\front\my_business_pc_newmanager_busimanage.cpt`
> - `E:\wh_projects\whjrscbmanage\whjrscbmanage\front\calculate_config.cpt`
>
> 佐证：`sql\whjrscbmanage.sql`（DDL）、上级页面 `front\my_business_pc_view.cpt` / `front\my_business_pc_view_manager.cpt`。
>
> 约定：只记录 cpt 中实际存在的原文；找不到标注「未发现」。

**关键外部依赖（本仓库内不可见）**
- `myFR` 是 FR 服务器上的共享前端库（`myFR.init / dialog.afterload / dialog.create / callCloud / validate / Msg.toast`），其 `.js` 实现不在本仓库（全仓无 `.js` 文件，`E:\wh_projects` 下也搜不到 `myFR.validate` 定义）。
- `myFR.callCloud("226008", ...)` 为云平台 API 调用；**API 226008 后端怎么落库、字段映射、审批流转均不在 cpt 内**——cpt 只负责拼参数。下面「落库」部分仅给出 DDL 佐证，不作为 cpt 事实。

---

## 一、my_business_pc_newmanager.cpt（更换客户经理 · 普通侧）

### 1.1 页面用途
- 从上级页 `my_business_pc_view.cpt` 的单元格按钮「**变更客户经理**」（列 c=10，JS 名「选择新的客户经理」）弹窗打开，`myFR.dialog.create('./my_business_pc_newmanager.cpt', {"id": id}, '编辑业务所属客户经理', 600, 450)`。
  - 弹窗标题原文：**「编辑业务所属客户经理」**（不是「更换客户经理」）；600×450。
  - 上级前置校验（在上面的按钮 JS 里，不在本页）：
    ```
    if(approval_id !== 'null'){ alert("本业务正在经历审批流程，不可变更");
    }else if(status != "3"){ alert("只有生效中的业务才能变更");
    }else{ myFR.dialog.create(...) }
    ```
    即：业务有审批中记录或 status≠3（非生效中）时不允许打开本弹窗。
- 用途：弹窗内选择新的「归属机构」+「客户经理」，点按钮「变更申请」（按钮文案「确定」）调云平台 226008 提交客户经理变更审批。

### 1.2 数据集清单（3 个，无过滤条件除「查询当前业务信息」按 id）
| 数据集名 | 连接库 | 参数 | SQL 原文 |
|---|---|---|---|
| 查询出所有的客户经理和机构 | assign | 无 | `SELECT CONCAT(w.user_name, '(', w.user_id, ')') AS name_with_id FROM whfr_user w WHERE w.status = '00'` |
| 查询机构号以及机构名称 | assign | 无 | `select CONCAT(b.branch_name,'(',b.branch_no,')') as dept_name from whoa_branch_info b where status = '01';` |
| 查询当前业务信息 | whjrscbmanage | `id`（`'${id}'`） | `select * from bus_bond_business b where b.id = '${id}'` |

### 1.3 页面字段
实际只有 3 个交互元素，**没有**只读展示区、没有「业务负责人」「所属管理条线」标签：
| 单元格 | 控件 | 内容 |
|---|---|---|
| B2 | （数据集列） | 绑定 `查询当前业务信息` 的 `id` 列，作隐藏 key（无控件） |
| B4 | ComboBox，控件名 `dept1` | 「归属机构」（标签在 B3「归属机构」），下拉选项 = 数据集「查询机构号以及机构名称」的 `dept_name` |
| C4 | ComboBox，控件名 `person1` | 「客户经理」（标签在 C3「客户经理」），下拉选项 = 数据集「查询出所有的客户经理和机构」的 `name_with_id` |
| B6:C6 合并 | FreeButton，控件名 `save` | 文案「**变更申请**」（FreeButton 内 `<Text>` 是「确定」） |
- 两个 ComboBox 均 `<widgetValue/>` 为空 → **无默认值**；字典为 `TableDataDictionary`，显示值=取值=`dept_name` / `name_with_id`（即下拉选中项本身即 `名称(编号)` 复合串）。
- 两个 combo 都挂了 `stopedit` 监听，js 为 `null`（无逻辑）。
- 说明：任务描述中「业务负责人(客户经理)、所属机构、所属管理条线」——页面上「客户经理」「归属机构」两标签存在；「业务负责人」「所属管理条线」标签**未发现**（`manage_line` 是 DDL 中 bus_bond_business 的一列，但本页不展示）。

### 1.4 逐字段规格
| 字段/控件名 | 标签原文 | 类型 | 选项来源 | 默认值 | 必填 | 可编辑 |
|---|---|---|---|---|---|---|
| `dept1` (B4) | 归属机构 | ComboBox（单选） | 数据集「查询机构号以及机构名称」`dept_name`（`branch_name(branch_no)`） | 空（widgetValue 空） | cpt 未声明（无校验规则） | 是 |
| `person1` (C4) | 客户经理 | ComboBox（单选） | 数据集「查询出所有的客户经理和机构」`name_with_id`（`user_name(user_id)`） | 空 | cpt 未声明 | 是 |
| `save` (B6:C6) | 变更申请（按钮文案「确定」） | FreeButton | — | — | — | 是 |

### 1.5 JS 逻辑
- afterload：`myFR.init()` / `myFR.dialog.afterload()`（仅这两行）。
- 保存按钮 click 原文（整段，含异常字符，见下）：
  ```
  if (!myFR.validate()) {
      return
  }
      function v(name) {
          var w = _g().getWidgetByName(name);
          return w ? w.getValue() : "";
      }
  console.log(newCreator);
  var newCreatorVal = v("person1").match(/\(([^)]A+)\)/)?.[1]A;
  var newOrgNameVal = v("dept1").replace(/\([^)]A+\)/, "");
  var newOrgCodeVal = v("dept1").match(/\(([^)]A+)\)/)?.[1]A;
  console.log("newCreator:", newCreatorVal);  console.log("newOrgCode:", newOrgCodeVal);
  console.log("newOrgName:", newOrgNameVal);
  myFR.callCloud("226008", {
      "businessId": id,
      "creator":creator,
      "newCreator" : newCreatorVal,
      "newOrgCode" : newOrgCodeVal,
      "newOrgName" : newOrgNameVal,
      "updaterType" : "0"
  }, () => {
      window.parent.FR.closeDialog()
      window.parent.contentPane.parameterCommit()
      window.parent.FR.Msg.toast("申请更改客户经理审批中")
  },null,true)
  ```
- **myFR.callCloud("226008") 参数映射**（全部明文在此 JS 中）：
  | 参数字段 | 取值来源 | 说明 |
  |---|---|---|
  | `businessId` | `id`（按钮 `Parameter id =B2`，即「查询当前业务信息」的 id 单元格） | 业务主键 |
  | `creator` | `$fine_username`（按钮 `Parameter creator =$fine_username`，当前登录人 OA） | 申请人/原经办人 |
  | `newCreator` | `v("person1")` 用正则取括号内内容 | 新客户经理的 **user_id**（`name_with_id = user_name(user_id)`） |
  | `newOrgCode` | `v("dept1")` 用正则取括号内内容 | 新归属机构 **branch_no** |
  | `newOrgName` | `v("dept1")` 用 replace 去掉括号部分 | 新归属机构 **branch_name** |
  | `updaterType` | 硬编码 `"0"` | 普通客户经理发起「申请更改」 |
  - 说明：`person1` 直接改为 `newCreator`（user_id），`dept1` 同时拆出 `newOrgCode`/`newOrgName`。**不是**更新 `cust_mgr`。
- 提交成功后回调：`window.parent.FR.closeDialog()` → `window.parent.contentPane.parameterCommit()` → toast「申请更改客户经理审批中」。即**通知上级页面刷新（parameterCommit）并关弹窗**。
- **按钮又被绑了 4 个公式参数**，但 JS 体内一个都没读（body 改为 `_g().getWidgetByName` 取值）：
  `id =B2`、`creator =$fine_username`、`newCreator =C4`（=person1 单元格）、`newOrgCode =B4`（=dept1 单元格）。后两者属冗余残留绑定。
- **⚠ 原文正则异常（重构必须修）**：`/\(([^)]A+)\)/` 与 `?.[1]A;` 中的 `A` 是源文件里的字面字符（已用 Grep 按字节复验），应是 `+` 的损坏或误写。后者 `expr?.[1]A` 在标准 JS 里是语法错误，会让整段点击 JS 无法编译；即便按某种解析降级，`newCreatorVal/newOrgCodeVal` 也会是 `undefined`。**意图逻辑**显然是：`match(/\(([^)]+)\)/)?.[1]` 取 `user_id` / `branch_no`，`replace(/\([^)]+\)/,"")` 取名称。重构时按意图逻辑实现，不要照抄。

### 1.6 权限（谁能换）
- 页面**内部无任何角色判定**：全仓（`whjrscbmanage` 整个目录）搜 `fine_role` **未发现任何匹配**；保存前唯一的门是 `if (!myFR.validate()) return`，而 `myFR.validate` 的实现位于外部共享 `myFR.js` 库（本仓库不可见，也无法搜到其定义）。
- 实际权限差异体现在**打开入口**：普通客户经理从 `my_business_pc_view.cpt`（pop 版）打开本页；业务管理岗从 `my_business_pc_view_manager.cpt` 打开 `_busimanage` 变体（见第二章）。这两个上级页如何被菜单/角色分发不在 cpt 内。
- DDL 佐证（不在此 cpt 内）：`bus_bond_business` 无 `cust_mgr` 列，「客户经理」即 `creator`（创建人OA，not null）+ `org_code`/`org_name`；另有 `bus_manager_change_history` 表记录 `old_handler/old_org_code/old_org_name → new_handler/new_org_code/new_org_name + applicant_oa`（变更历史），`iassist_flow_data` 记录审批流 JSON。API 226008 究竟写主表、写历史表、走审批，均为后端行为，cpt 内看不到。

### 1.7 从哪来、提交后刷新谁
- 来源：`my_business_pc_view.cpt`「变更客户经理」按钮 → `myFR.dialog.create('./my_business_pc_newmanager.cpt', {"id": id}, '编辑业务所属客户经理', 600, 450)`；打开前提是 `approval_id == 'null'` 且 `status == "3"`。
- 提交后：关弹窗 + `window.parent.contentPane.parameterCommit()` 刷新所属的报表（parameterCommit 是 FR 参数查询刷新）。

---

## 二、my_business_pc_newmanager_busimanage.cpt（更换客户经理 · 业务管理岗变体）

### 2.1 与 newmanager 的差异对照表
| 维度 | my_business_pc_newmanager.cpt（普通侧） | my_business_pc_newmanager_busimanage.cpt（管理岗变体） |
|---|---|---|
| 上级打开页 | `my_business_pc_view.cpt` | `my_business_pc_view_manager.cpt` |
| 弹窗 create 参数 | `{"id": id}` | `{"id": id, "updaterType":1}` |
| 弹窗标题/尺寸 | 编辑业务所属客户经理 / 600×450 | 编辑业务所属客户经理 / 600×450 |
| 数据集（3 个 SQL 与连接库） | 完全一致（见 1.2） | 完全一致 |
| 字段/控件/label（归属机构+客户经理+变更申请按钮） | 一致 | 一致 |
| 保存 JS `updaterType` | 硬编码 `"0"` | 硬编码 `"1"` |
| 保存 JS 其他 | 有 `console.log(newCreator);` 一行 | 无该行（其余 body 逐字相同，含 `A` 正则异常） |
| 按钮公式参数绑定 | `newCreator =C4`、`newOrgCode =B4` | `newCreator =B4`、`newOrgCode =C4`（**互换**） |
| 提交后回调 | 关窗 + parameterCommit + toast「申请更改客户经理审批中」 | 同左 |
| 打开前置校验 | `approval_id!='null'` → 报「本业务正在经历审批流程，不可变更」；`status!="3"` → 报「只有生效中的业务才能变更」 | 同左 |

结论：
- **是否接收 updaterType=1 参数**：上级确实传入 `"updaterType":1`；但本弹窗 afterload（`myFR.init(); myFR.dialog.afterload()`）与保存 JS 都**不读取**该 URL 参数——`updaterType` 是在保存 JS 里**逐字硬编码 `"1"`**。所以 `updaterType` 的语义只体现在请求体里，父页传参是“陈述身份”，非功能开关。
- **管理岗换经理流程是否多了更新责任人或机构字段**：**没有**。两个变体请求字段完全一致（businessId/creator/newCreator/newOrgCode/newOrgName/updaterType），唯一的差别就是 `updaterType` 值 0→1。`updaterType` 如何在 226008 后端区分「发起审批申请(0)」与「直接变更(1)」、以及是否额外更新 responsibility/org/审批跳过，cpt 中不可见（**未发现**）。

---

## 三、calculate_config.cpt（通道费计算配置）

### 3.1 数据集「获取配置参数」
| 数据集名 | 连接库 | 参数 | SQL 原文 |
|---|---|---|---|
| 获取配置参数 | whjrscbmanage | 无 | `select * from bus_upper_storage_config` |

### 3.2 页面用途
- 一张**填报式（web write）配置页**：无任何 JS（无 `myFR.init`、无 `callCloud`、无存储过程调用），靠工具栏「提交/校验」+ 内置 SQL 提交器回写数据表 `bus_upper_storage_config`。
- 可见标签（labels.txt 原文集合）：**「计算参数」**（B2:C2 节标题）、**「增值税」**（B3）、**「附加」**（C3）。
- **任务描述中猜测的「上存利率(%)」「通道费金额(%)」「债券编号」「默认值」标签在本 cpt 中全部未发现**。本页可配置的可见字段只有「增值税(单元格 B4)」和「附加(单元格 C4)」两个。
- DDL 佐证（列注释）：`bus_upper_storage_config` 的 `coupon_rate`='票面利率 单位 （年化） 如 3 650000'，`vat`='增值税 单位 如 0 060000'，`surcharge`='附加税 单位 如 0 012000'；`config_key` 唯一且注释「目前固定 GLOBAL」。该表大概率单行，供上存利率自动计算使用（`bus_bond_business.upper_storage_rate` 注释：自动计算= coupon_rate 减 vat 减 surcharge 减 channel_fee_amount）——但这是 DDL 注释层面，非本页功能主体。

### 3.3 逐字段规格
| 单元格 | 绑定数据集列 | 控件 | 标签/说明 |
|---|---|---|---|
| B1 | `获取配置参数.id`（DSColumn） | 无（隐藏 key） | 详情行主键（上层单行配置即该行） |
| B2:C2 | — | 静态文本 | 节标题「计算参数」 |
| B3 | — | 静态文本 | label「增值税」 |
| C3 | — | 静态文本 | label「附加」 |
| B4 | `获取配置参数.vat`（DSColumn） | TextEditor（NoneReg，无校验正则，无默认 widgetValue） | 增值税输入框 |
| C4 | `获取配置参数.surcharge`（DSColumn） | TextEditor（NoneReg，无校验正则，无默认 widgetValue） | 附加税输入框 |
| （A4） | — | **无控件、无标签** | 提交映射中 `coupon_rate ←=A4` 引用的空单元格（见 3.4） |

- 可见列只展示 `vat`、`surcharge` 两列，用 TextEditor 直接编辑；`id` 仅作 key 隐藏绑定。

### 3.4 保存行为（内置 SQL 提交器，非 API）
`ReportWriteAttr → BuiltInSQLSubmiter「内置SQL1」→ DMLConfig`，目标连接 `whjrscbmanage`、目标表 `bus_upper_storage_config`：
| 写列 | 单元格公式 | 角色 |
|---|---|---|
| `id` | `=A1` | isKey="true"（主键定位更新行） |
| `coupon_rate` | `=A4` | 普通列——但 **A4 在报表里是空单元格、且无控件**，提交时该列为空值（疑似遗留映射/可配置项未展示） |
| `vat` | `=B4` | 普通列 ← 增值税输入框 |
| `surcharge` | `=C4` | 普通列 ← 附加税输入框 |
- **未写**：`config_key`、`updater`（最后修改人OA）、`update_time` 三列。`updater/update_time` 在 DDL 中可为 NULL，但 submit 映射里**根本没有这两列**（cpt 不写）。
- 保存触发：工具栏「提交」按钮（`Fine-Engine_Report_Utils_Submit`）+「校验」按钮（`Fine-Engine_Report_Verify_Data`），是 FE 填报页标准行为；**没有任何自定义 JS 事件（无 Listener JS）**。
- 页面上无任何按钮调用云平台 API；任务描述中的「有无存过 API 调用/存储过程」→ cpt 内**未发现任何服务端 API/存储过程调用**（纯内置 SQL 提交器）。

---

## 附：重构要点速览
1. `newmanager` 两变体 = 一套 UI，唯一功能差异是保存请求里的 `updaterType`（0/1）与父页入口；建议 fr-flow 侧用单一组件 + `updaterType` prop（父页传入 0 或 1），替代两套可说完全剪复制的 cpt。
2. 保存 payload 固定：`businessId / creator(=当前登录人OA) / newCreator(=user_id) / newOrgCode(=branch_no) / newOrgName(=branch_name) / updaterType`；匹配下拉选项来源的两条 SQL（assign.whoa_branch_info status='01'、assign.whfr_user status='00'）直接复用。
3. 正则修复：`person1` 取 `\(...\)` 内 user_id，`dept1` 取括号内 branch_no、去括号得 branch_name（cpt 原文的 `A` 异常必须丢弃）。
4. 提交成功：关弹窗 + 触发上级列表刷新（对标 `parameterCommit`）+ toast「申请更改客户经理审批中」。
5. `calculate_config`：纯表单页，两个可编辑字段（vat/surcharge）+ 隐藏 id 主键；保存走表单 PUT 到 `bus_upper_storage_config`（coupon_rate 空值写回的问题需与后端确认是否保留）。