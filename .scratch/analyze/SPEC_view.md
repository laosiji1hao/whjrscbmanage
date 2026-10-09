# 金市业务查看三页面规格（my_business_pc_view / _manager / _export）

> 分析对象：`E:\wh_projects\whjrscbmanage\whjrscbmanage\front\` 下三个 cpt（UTF-8）
> 数据源连接：命名连接 `whjrscbmanage`；变更经理弹窗还用到连接 `assign`
> 三页均为 **大列表页**，核心交互不在 JS 块里，而在 **单元格超链接（`NameJavaScriptGroup`）/行事件（`FreeButton`-`Listener click`）** 与 WebWriteContent 的 **ToolBar 按钮** 中。
> 公共运行参数：`cloudUrl = "http://" + $cloud_service_ip`，`prjId = whjrscbmanage`，`write_file_name = my_business_pc_write.cpt`，`busi_path`（恒空），`pp_pagesize=20`，`pp_pageno=1`。

---

## 一、my_business_pc_view.cpt —— 金市业务查看（个人业务池）

### 1. 页面用途与入口/权限
- 用途：登录用户在 `bus_bond_business`（债券/金市业务台账主表）中查询**自己创建（`creator = $fine_username`）**的业务，见主数据集 `金市业务` WHERE `and creator = '${fine_username}'`。
- 进入后默认在参数面板提供 `客户名称/项目/债券名称/状态` 三个筛选 + `查询/重置/新增`；顶部 WebPageContent 工具栏含 `首页/上一页/下一页/末页` + `导入`/`导出`（`导入` 的 JS 为 `null` 死按钮）；WebWriteContent 工具栏含 `首页/上一页/空/下一页/末页/空/导出`（最后一个“导出”为真实导出按钮）。
- 修改/变更/中止均要求业务处于 **status=3（生效中）**，且**无未完结审批流**（`iassist_flow_data` 中 `business_no=bond_code and approval_status=0` 无记录）。

### 2. 数据集清单（`<TableDataMap>`）

| 数据集 | 类型 | 参数 | SQL | 用途 |
|---|---|---|---|---|
| `pagetool` | DB | `pp_pagesize`、`biz_name`、`customer_name`、`fine_username`(公式 `=$fine_username`)、`status` | `select count(*) as totalcnt, ceiling(count(*) / ${pp_pagesize}) as totalpage from (select * from bus_bond_business where 1=1 and status !="5" and status != '6' and creator = '${fine_username}' ${customer_name} ${biz_name} ${status}) t1` | 分页统计（总条数/总页数） |
| `金市业务` | DB | `pp_pagesize`(**20**)、`pp_pageno`(**1**)、`biz_name`、`pp_cutpage`(**空**)、`customer_name`、`fine_username`(公式)、`status`(**默认 `3`**) | `select * from bus_bond_business where 1=1 and status != '5' and status != '6' and creator = '${fine_username}' [customer_name] [biz_name] [status] order by id desc ${if(len(pp_cutpage)=0, "limit "+(pp_pageno-1)*pp_pagesize+", "+pp_pagesize, "")}` | **主列表数据源**：本人创建、排除 status 5/6、按 id 降序分页；`pp_cutpage` 非空时取消 limit（全量） |
| `查询当前业务信息` | DB | 无 | `SELECT * FROM bus_bond_business where status != '5' and status != '6'` | 供 `customer_name`/`biz_name` 两个筛选下拉的数据字典（字段同名） |
| `业务状态` | EmbeddedTableData（内嵌加密） | 无 | 内嵌 2 行 key/value（FR `1Z` 专有编码，见 §3 字典） | 状态列显示 + `status` 筛选下拉的字典 |
| `审核状态` | DB | `bond_code`(公式 **`=D3`**) | `select * from iassist_flow_data where business_no = '${bond_code}' and approval_status = 0` | 逐行探测“是否有进行中的审批”，其 `id` 填入单元格 P3（即行 JS 中的 `approval_id`） |

> 注意 `金市业务` 的 `status` 参数**声明默认值为 `3`**，但参数面板同名 widget `status` 的 `widgetValue` 为空，实际以 widget 空值为准（即默认不过滤状态）；`pagetool` 的 `status` 无默认值。

### 3. 字典值
- **业务状态（status）**：内嵌表 `1Z` 编码，列 `key/value`，共 2 行（行 2 在 manager 版更长）。XML 中无法直接读出明文，但由数据库 schema（`whjrscbmanage/sql/whjrscbmanage.sql` 第 61 行）与行 JS 逻辑交叉确认为：
  - `0 未完善`、`1 审核中`、`2 审核失败`、`3 生效中`、`4 已过期`、`5 已中止`
  - `6`：SQL 未定义，但三个查询均 `status != '6'` 排除。
  - 行 JS 判定依据：`status == "3"` 才允许编辑/变更；`status == "4"` 禁止中止；`status == "0"`（未完善）显示“完善业务信息”按钮。
- **审核状态（approval_status，iassist_flow_data）**：`0 待审批`、`1 通过`、`2 驳回`（SQL 第 134 行）；页面无显示列，仅以 P3 是否有值（`id`）判断“本业务正在经历审批流程，不可变更”。

### 4. 顶部参数面板（`FormParameterUI`，1098×111）
| 控件 | 类型 | 数据字典 | 行为 |
|---|---|---|---|
| `customer_name` | ComboBox | 查询当前业务信息.customer_name | 融资人名称（授信主体），x=116 y=15 w=198 |
| `biz_name` | ComboBox | 查询当前业务信息.biz_name | 项目/债券名称，x=124 y=61 w=190 |
| `status` | ComboBox | 业务状态（key/value） | 状态，x=465 y=14 w=110 |
| `searchBtn` | FormSubmitButton | – | “查询”，hotkey=enter，x=625 y=15 w=80 |
| `addBtn` | FreeButton | – | “新增”→ `myFR.dialog.create('./my_business_pc_add.cpt',{"id":0},'新增业务信息',1400,1200)`，x=742 y=15 w=80 |
| `reset_c` | FreeButton | – | “重置”→ 依次 `customer_name.reset(); biz_name.reset(); status.reset(); _g().parameterCommit()`，x=625 y=54 w=80 |
| `scrollLeft` / `scrollTop` | TextEditor（invisible） | – | 隐藏，初始 `0`，用于记忆滚动位置（见 §7） |

### 5. 列表列定义（Row1 表头 → Row2 数据，逐一单元格）
冻结区 `FrozenColumnRow columnrow="A3"`（冻结 A 列与 1–2 行表头）。行高：r0=720000、r1=2628900、r2=1943100、r3=1440000、r4+ 默认 723900。

| 单元格 | 表头文本 | 数据字段/公式 | 说明 |
|---|---|---|---|
| A0 | `当前查询结果条数为：`…(cs=8, r0) | `=CONCATENATE("当前查询结果条数为：",VALUE("pagetool",1,1))` | 统计总条数 |
| B1 | 主键 | B3=`金市业务.id` | 表头高亮 `条件属性1`(ColWidth) → **列宽 0 隐藏**；B3 为 JS 的 `id`，且 DML 主键列 |
| C2 | 序号 | `=seq()` | 行号 |
| D3 | 债券编号或内部编号 | `金市业务.bond_code` | 即行 JS 的 `bond_code`（D3） |
| E4 | ECIF客户编号 | `金市业务.ecif_customer_no` | |
| F5 | 客户编号 | `金市业务.customer_no` | |
| G6 | 融资人名称 | `金市业务.customer_name` | |
| H7 | 项目/债券名称 | `金市业务.biz_name` | |
| I8 | 状态 | `金市业务.status` + DictPresent(业务状态) | 以字典显示；行 JS 的 `status`（I3） |
| J9–N13 | **操作**（表头 cs=5 合并） | 见 §6 行交互 | J/K/L/M/N 五列 |
| O14 | 删除 | FreeButton（**列宽 0 隐藏**） | 行 JS 的“删除”按钮本体 |
| P15 | （无表头，隐藏） | `审核状态.id`（列宽 0 隐藏） | 行 JS 的 `approval_id`（P3） |
| r3 | 暂无数据 | 合并 B3:H3；高亮 `为空行高为0`：`len(B3) != 0` 时行高为 0 | 空态提示 |

数据行（r2）所有 B–I 列均有隔行底色高亮 `row() % 2 = 0`。

### 6. 行交互（单元格事件，全部在 cpt XML 中）

1. **完善业务信息**（J9，FreeButton `Listener click 点击1`）
   ```js
   myFR.dialog.create('./my_business_pc_add.cpt',{"id":id /*=B3*/},'新增业务信息',1400,1200)
   ```
   高亮 `条件属性2`：`I3 != '0'`（WidgetHighlightAction）→ 仅 status=0（未完善）时显示该按钮。
2. **变更客户经理**（K10，`NameJavaScript name="选择新的客户经理"`，参数 `id=B3, approval_id=P3, status=I3`）
   ```js
   if(approval_id !== 'null'){ alert("本业务正在经历审批流程，不可变更"); }
   else if(status != "3"){ alert("只有生效中的业务才能变更"); }
   else { myFR.dialog.create('./my_business_pc_newmanager.cpt',{"id":id},'编辑业务所属客户经理',600,450) }
   ```
   → 打开 **my_business_pc_newmanager.cpt**（未传 updaterType；该弹窗内部提交改派时 `myFR.callCloud("226008",{... "updaterType":"0"}, ...)`）。
3. **编辑**（L11，`NameJavaScript name="编辑"`，参数同上）
   ```js
   if(approval_id !== 'null'){ alert("本业务正在经历审批流程，不可变更"); }
   else if(status != "3"){ alert("只有生效中的业务才能编辑"); }
   else { myFR.dialog.create('./my_business_pc_look.cpt',{"id":id},'编辑业务信息',1200,900) }
   ```
4. **创建分期**（M12，`NameJavaScript name="编辑"`，参数 `id=B3`）
   ```js
   myFR.dialog.create('./my_business_pc_installment.cpt',{"id":id},'创建分期业务',1200,900)
   ```
   （无状态/审批判断）
5. **中止**（N13，`NameJavaScript name="删除"`，参数 `row=row()-1, col=col()-1, approval_id=P3, status=I3`）
   ```js
   if(approval_id !== 'null'){ alert("本业务正在经历审批流程，不可变更"); }
   else if(status == "4"){ alert("已过期的业务不允许中止"); }
   else { FR.Msg.confirm("提示","确认中止业务?",function(e){ if(!e){return;}
     _g().getWidgetByCell(FR.columnRow2CellStr({col:col+1,row:row})).doClick() }) }
   ```
   → 确认后触发 **O14 列“删除”按钮** 的 click。
6. **删除/中止真正动作**（O14，隐藏 FreeButton `Listener click 删除`，参数 `bond_code=D3, terminator=$fine_username`）
   ```xml
   <JavaScript>myFR.callCloud("226009", {"bondCode": bond_code, "terminator": terminator, "updaterType" : "0"},
     () => { window.parent.FR.closeDialog(); window.parent.contentPane.parameterCommit();
            window.parent.FR.Msg.toast("中止业务流程审批中") }, null, true)</JavaScript>
   ```
   → 云端接口 **226009** 发起“中止”审批流，**updaterType="0"**。

### 7. 分页与滚动
- **分页**：afterload 执行 `myFR.init(); pagecut.newPageCut();`（`pagecut` 为共享 JS 库；按钮 `page_first/page_previous/page_next/page_last` 驱动 `金市业务` 分页，`pagetool` 提供 `totalcnt/totalpage`）。
- **导出全量**：WebWriteContent 工具栏“导出”按钮把 `pp_cutpage=v` 拼进 URL → 目标 cpt（`my_business_pc_view_export.cpt`）取消 LIMIT：
  ```xml
  url = CONCATENATE($servletURL,"?format=excel&extype=simple&pp_cutpage=v&viewlet=",$relativeViewlet,"my_business_pc_view_export.cpt")
  ```
  ```js
  var customer_name = _g().getParameterContainer().getWidgetByName('customer_name').getValue() || "";
  var biz_name      = ...'biz_name'...
  var status        = ...'status'...
  var creator = creator;   // 绑定参数 =$fine_username
  var REPORT_URL = url +'&creator='+encodeURIComponent(creator)+'&customer_name='+encodeURIComponent(customer_name)
                       +'&biz_name='+encodeURIComponent(biz_name)+'&status='+encodeURIComponent(status);
  window.open(REPORT_URL);
  ```
- **滚动记忆**：afterload 恢复 `#frozen-center` 的 `scrollTop/scrollLeft`（读自隐藏参数 `scrollTop/scrollLeft`），并在滚动 500ms 防抖后写回这两个参数。

---

## 二、my_business_pc_view_manager.cpt —— 金市业务查看（经理/管理岗变体）

### 与 view 的**完整差异对照表**

| 维度 | view（个人池） | manager（管理岗） |
|---|---|---|
| **主数据集 SQL** | 仅 `bus_bond_business`，无 join | `select *, CONCAT(w.user_name,'(',b.creator,')') as related_name, wb.dept_name from bus_bond_business b LEFT JOIN whfr_user w ON b.creator = w.user_id LEFT JOIN whoa_branch_info wb ON b.org_code = wb.branch_no` |
| **数据范围** | `creator = '${fine_username}'`（只看自己） | **不做 creator 过滤**（看全行），排除 `status !='0'` 且 `!=5` 且 `!=6`（连草稿也不看） |
| **筛选条件** | customer_name / biz_name / status（三参数，查询+重置） | **customer_name / biz_name 两项**（无 status）；**无 status 下拉** |
| **status 参数** | 有（ComboBox+数据集默认3） | 数据集中无 status 参数，`pagetool` 亦无 |
| **排序** | `order by id desc` | **无 order by** |
| **分页统计** | 同上 | `pagetool` 同结构（仍排除 0/5/6） |
| **`查询当前业务信息`** | `where status != '5' and status != '6'` | 再加 `b.status !='0'`（下拉不含草稿） |
| **列（新增）** | – | `D3 标准/非标准`=bond_type（**列宽 0 隐藏**）、`K10 业务所属客户经理`=related_name（**DictPresent 误绑业务状态**）、`L11 业务所属机构`=dept_name（**DictPresent 误绑业务状态**） |
| **“操作”按钮** | 完善业务信息 / 变更客户经理 / 编辑 / 创建分期 / 中止 / 删除 | **只有** 变更客户经理 / 编辑 / 中止 / 删除（无“完善业务信息”，**无“创建分期”**） |
| **变更客户经理弹窗** | `./my_business_pc_newmanager.cpt`（仅 `{"id":id}`） | `./my_business_pc_newmanager_busimanage.cpt`，参数 **`{"id":id,"updaterType":1}`**，标题/尺寸同 `编辑业务所属客户经理` 600×450 |
| **newmanager 弹窗内 226008** | updaterType `"0"` | updaterType `"1"`（`newmanager_busimanage.cpt` 内固定 `"updaterType":"1"`） |
| **编辑弹窗** | `./my_business_pc_look.cpt` | `./my_business_pc_look_busimanage.cpt`，标题/尺寸同 `编辑业务信息` 1200×900 |
| **删除/中止 226009** | `"updaterType":"0"` | `"updaterType":"1"`；`myFR.callCloud("226009", {...}, true, () => {...}, null, true)`（**多一个中间 `true` 参数**） |
| **行 JS 引用** | `id=B3, bond_code=D3, status=I3, approval_id=P3` | `id=B3, bond_code=E3, status=J3, approval_id=Q3`（列整体右移） |
| **参数面板** | 有 status 下拉、`新增`按钮、`重置`(3 项) | **无 status、无“新增”按钮**；额外按钮 `reset_c_c`=“**配置上存利率计算参数**” → `myFR.dialog.create('./calculate_config.cpt',{"id":0},'配置计算参数',700,600)`；`reset_c` 重置**仅 customer_name+biz_name** |
| **标题** | 顶部“当前查询结果条数为：…” | 同（cs=9） |
| **`业务状态`内嵌表** | 第 2 行 16 字符 | 第 2 行 **26 字符**（多 2~3 个条目） |
| **表头 语言** | 无“标准/非标准” | 在 D3 列（隐藏） |
| **ReportExportAttr** | 无 | **有**（Excel `hideRow=false`/PDF/HTML/Word/Image 192dpi png） |
| **工具栏导出** | 带 `creator/status` | 仅带 `customer_name/biz_name`（不加 creator/status → 导出内容 = 全机构非草稿） |
| **ExcelImport** | title=`D2:H2` data=`D3:H3` | title=`E2:I2` data=`E3:I3` |
| **DML 写库配置** | 映射第 2 行各列到 `bus_bond_business`（见下） | 同 view、但细胞引用自动右移一位（=E3 起） |
| **StrategyConfigs** | 4 个 ds | 多一个 **`本记录是否有审核`**（**数据集不存在**，仅残留引用） |

**manager 的隐藏列总结**：B（主键，列宽0）、D（标准/非标准，宽度0）、P16（删除按钮，隐藏）、Q17（审核状态.id，隐藏）。可见列 = 序号/债券编号/ECIF客户编号/客户编号/融资人名称/项目债券名称/状态/业务所属客户经理/业务所属机构/操作。

**⚠ manager 的 related_name、dept_name 两列都挂了 `DictPresent(业务状态)`**（XML 原样），是把状态字典错误地套在姓名/机构列上，属于原文件缺陷，重构时应去掉。

**DML/写库配置（两页相同结构）**：`ReportWriteAttr → BuiltInSQLSubmiter(金市业务)` `IntelliDMLConfig`，目标表 `bus_bond_business`，`id` 为 key，其余约 50 列（bond_code、ecif_customer_no、customer_no、customer_name、biz_name、bond_type、biz_type、green_tech_flag、ext_rating、ext_rating_date、rating_agency、int_rating、int_rating_date、industry、customer_type、alert_customer、start_date、mature_date、currency、orig_amount、rmb_amount、balance、invest_rate、transfer_rate、guarantee_info、breach_flag、five_level_class、fund_used_flag、fund_used_up、installment_flag、installment_plan、our_bank_underwrite、manage_line、dept、agreed_usage、fund_account、fund_account_flag、supervise_account、supervise_account_flag、supervision_flag、drawdown_check、is_original_am、exercise_flag、exercise_date、remark、js_remark、js_remark_flag、inspect_freq、inspector_post、creator、org_code、org_name、status、termination_reason、exercise_reminder_sent）均由“行数据公式”赋值（view 多为 `=H3`；manager `=I3`），配合 ExcelImport 使用。

---

## 三、my_business_pc_view_export.cpt —— 金市业务查看·导出

### 与 view 的**完整差异对照表**

| 维度 | view | export |
|---|---|---|
| **用途** | 在线查询 | **Excel 导出台面**（由 view/manager 工具栏“导出”以 `format=excel&extype=simple&pp_cutpage=v` 打开，输出简单 Excel） |
| **`金市业务` SQL** | 无 join、creator 过滤 | `select *, CONCAT(w.user_name,'(',b.creator,')') as related_name from bus_bond_business b LEFT JOIN whfr_user w ON b.creator = w.user_id where 1=1 and b.status != '5' and b.status != '6'` + `${if(len(creator)=0,"and b.status != '0'"," and b.creator = '"+creator+"'")}` + customer_name/biz_name/status，`order by b.id desc`，`limit` 仍受 `pp_cutpage` 控制 |
| **`pagetool`** | creator 过滤 | 同样支持 `creator` 参数：`${if(len(creator)=0,"and status != '0'"," and creator = '"+creator+"'")}`（params 含 `pp_pagesize? biz_name、customer_name、status、creator`；`pp_pagesize` 默认**空**） |
| **params** | – | `pp_pagesize=20、pp_pageno=1、status=3(默认)、creator(空)、biz_name/customer_name(空)、pp_cutpage(空)` |
| **查询当前业务信息** | `status!=5 && !=6` | 同 view（**含草稿**） |
| **列** | 12 个字段列+操作 | **57 个数据列（无操作列，无按钮）**，宽表，见下表 |
| **行事件** | 6 个操作按钮 | **没有任何按钮/超链接/NameJavaScriptGroup** |
| **工具栏导出按钮** | 指向 export cpt | 指向 **`my_business_pc_view.cpt`**（`?format=excel...viewlet=...my_business_pc_view.cpt`，仅带 customer_name/biz_name）→ 双向索引 |
| **新增按钮** | 有 | **有**（`addBtn` 残留，`my_business_pc_add.cpt id=0` 1400×1200）；`searchBtn`/`reset_c`/`status` 下拉同 view（重置含 status） |
| **审核状态** | P3 隐藏列 | **无**（导出不判断审批） |
| **ExcelImport** | D2:H2 / D3:H3 | `H2:I2 / H3:I3` |
| **DML** | 全列 | 同结构，细胞首列 `=A3`（id），多数 `=H3/=I3` |
| **数据字典数据集** | 1 个 `业务状态` | **额外嵌入 13 组“数据字典-xx”**（见 §导出表格/字典） |
| **单元格网格** | 15 列×5 行 | 58 列×8 行（r0 标题计数、r1 表头、r2 数据、r3 暂无数据、r4–r7 少量空单元格） |

### 导出表格列定义（表头归一 + 数据映射，★ 为带字典的列）
数据行 r2 单元格：`seq()`=C2；其余为 `金市业务` 列。**个别列头与数据错位**（原文件即如此，见标注）。

| 列 | 表头 | 数据字段 | 字典 |
|---|---|---|---|
| A | – | – | |
| C2 | 序号 | `=seq()` | |
| D3 | 债券编号或内部编号 | `bond_code` | |
| E4 | ecif客户编号 | `bond_type` ⚠（表头是 ecif，数据是标非标，原文件错位，**未导出 ecif_customer_no**） | |
| F5 | 客户编号 | `customer_no` | |
| G6 | 融资人名称 | `customer_name` | |
| H7 | 项目/债券名称 | `biz_name` | |
| I8 | 标准/非标准 | `bond_type` | |
| J9 | 业务品种 | `biz_type` | ★`数据字典-业务品种` |
| K10 | 是否绿色/科技/养老/不涉及 | `green_tech_flag` | ★`数据字典-是否绿色` |
| L11 | 外部信用评级 | `ext_rating` | |
| M12 | 外部信用评级日期 | `ext_rating_date` | |
| N13 | 外部评级机构 | `rating_agency` | |
| O14 | 内部评级 | `int_rating` | |
| P15 | 内部评级日期 | `int_rating_date` | |
| Q16 | 行业分类 | `industry` | |
| R17 | 客户分类 | `customer_type` | ★`数据字典-客户分类` |
| S18 | 是否我行预警客户 | `alert_customer` | ★`数据字典-是不涉及` |
| T19 | 发放日/购买日 | `start_date` | |
| U20 | 到期日 | `mature_date` | |
| V21 | 币种 | `currency` | ★`数据字典-币种` |
| W22 | 初始金额 | `orig_amount` | |
| X23 | 初始金额(折人民币) | `rmb_amount` | |
| Y24 | 业务余额(折人民币) | `balance` | |
| Z25 | 投资利率(%) | `invest_rate` | |
| AA26 | 价值转移利率(%) | `transfer_rate` | |
| AB27 | 担保情况 | `guarantee_info` | ★`数据字典-担保情况` |
| AC28 | 是否逾欠/违约 | `breach_flag` | ★`数据字典-是不涉及` |
| AD29 | 五级分类 | `five_level_class` | ★`数据字典-五级分类` |
| AE30 | 是否涉及我行资金监管 | `fund_used_flag` | ★`数据字典-是不涉及` |
| AF31 | 我行监管资金是否已使用完毕 | `fund_used_up` | ★`数据字典-是不涉及` |
| AG32 | 是否涉及分期还款 | `installment_flag` | ★`数据字典-是不涉及` |
| AH33 | 还款计划 | `installment_plan` | |
| AI34 | 是否我行承销 | `our_bank_underwrite` | |
| AJ35 | 主承销商/联席主承销商 | `lead_underwriter` | |
| AK36 | 所属管理条线 | `manage_line` | |
| AL37 | 对应处室 | `dept` | ★`数据字典-对应初室` |
| AM38 | 约定资金用途 | `agreed_usage` | |
| AN39 | 是否有资金发放账户 | `fund_account_flag` | ★`数据字典-是不涉及` |
| AO40 | 资金发放/募集账户账号(我行) | `fund_account` | |
| AP41 | 是否有资金监管账户 | `supervise_account_flag` | ★`数据字典-是不涉及` |
| AQ42 | 资金监管/回款专户账号(我行) | `supervise_account` | |
| AR43 | 是否原资产管理部回表业务 | `is_original_am` | ★`数据字典-是不涉及` |
| AS44 | 是否行权 | `exercise_flag` | ★`数据字典-是不涉及` |
| AT45 | 行权日期 | `exercise_date` | |
| AU46 | 支用检查情况 | `drawdown_check` | |
| AV47 | 批复号 | `remark_number` | |
| AW48 | 批复管理要求 | `remark` | |
| AX49 | 是否金融市场部批复管理要求 | `js_remark_flag` | ★`数据字典-是不涉及` |
| AY50 | 金融市场部批复管理要求 | `js_remark`（**dsName=查询当前业务信息** ⚠ 与其它列不同源，重构应改回 `金市业务`） | |
| AZ51 | 实地检查频率(月) | `inspect_freq` | |
| BA52 | 投后检查实施人员岗位 | `inspector_post` | |
| BB53 | 客户经理 | `related_name` | |
| BC54 | 业务发生机构 | `org_name` | |
| BD55 | 业务状态 | `status` | ★`业务状态`（key/value，同 view） |
| BE56 | 是否有通道费 | `is_passage` | ★`数据字典-是不涉及` |
| BF57 | 通道费金额(%) | `passage_amount` | |
| BG58 | 上存利率(%) | `upper_storage_rate` | |

（列“对应处室”表头在 XML 中末尾含一个空格：`对应处室 `。）

### 导出功能
- 真正的 Excel 导出由 **view/manager 的工具栏“导出”** 触发：`format=excel&extype=simple&pp_cutpage=v&viewlet=..._export.cpt` + 筛选参数。
- **view→export**：`creator=$fine_username` + `customer_name/biz_name/status`；export 查询按 `creator` 走“只看该人”分支（**不再排除草稿**）。
- **manager→export**：仅 `customer_name/biz_name`（creator 空 → 走 `status != '0'` 分支，**排除草稿**，全机构可见）。
- export 页自身无“导出 Excel”按钮（其工具栏“导出”返回 view 页面）；`pp_cutpage=v` 取消 LIMIT 实现全量导出。
- 页内还有 `新增`按钮与 status 下拉（复制自带，非导出必需）。

### 导出页内嵌“数据字典”真相
内嵌表均为 `EmbeddedTableData`，FR 以 **Ascii85**（特殊“`1Z`”前缀=zlib）加密存于 XML，`ColumnNames` 串为 `key,,.,,value` 或单列 `val`；除 `数据字典-是否绿色` 外，其余字节带额外二进制头无法直接还原明文（标注解码状态）。

| 数据集 | 列 | 行数(编码) | 解码结果/来源 |
|---|---|---|---|
| `数据字典-业务品种` | key,value | 5 行 | **未解码**（二进制头）。SQL 注释：`biz_type 业务品种 整数编码 0到12` |
| `数据字典-信用评级` | val（单列） | 1 行 | **未解码**（二进制头）；含义=外部/内部信用评级选值 |
| `数据字典-行业分类` | key,value | 7 行 | **未解码**。SQL 注释：`industry 0 货币金融服务 1 资本市场服务 2 保险业 3 其他金融业` |
| `数据字典-币种` | key,value | 1 行 | 未解码；`currency` DB 默认`人民币` |
| `数据字典-是否绿色` | key,value | 1 行 | ✅ **已解码**：`绿色=0、科技=1、养老=2、不涉及=3`（与 SQL 注释一致） |
| `数据字典-所属管理条线` | key,value | 1 行 | 未解码；`manage_line` DB 默认`金融市场部` |
| `数据字典-是不涉及` | key,value | 1 行 | 未解码；用于 `alert_customer/fund_used_*/supervise_*/installment_flag/breach_flag/is_original_am/exercise_flag/js_remark_flag/is_passage`（是/不涉及类两值或三值字典） |
| `数据字典-客户分类` | key,value | 1 行 | 未解码；SQL 注释：`customer_type 0 一类 1 二类 2 三类 3 四类` |
| `数据字典-五级分类` | key,value | 1 行 | 未解码；`five_level_class` DB 默认`正常一档` |
| `数据字典-对应初室` | key,value | 2 行 | 未解码；`dept`=对应处室（利率室/同业室） |
| `数据字典-担保情况` | key,value | 1 行 | 未解码；`guarantee_info` DB 默认`信用`，自由文本 |
| `数据字典-是否` | key,value | 1 行 | 未解码；0/1 是否类通用字典 |

---

## 四、重构备忘（跨三页速查）
- **三页共用**：数据集 `pagetool/金市业务/查询当前业务信息/业务状态/审核状态`、`pagecut` 分页 + 滚动记忆 afterload、`cloudUrl/prjId/write_file_name/busi_path` 参数、经典浅灰主题。
- **updaterType 语义**：view（个人）相关弹窗/接口一律 `"0"`；manager（管理岗）一律 `"1"`；`226009`=中止流程，`226008`=变更客户经理流程（newmanager_busimanage 用 `newCreator` 替换，newmanager 用 `newOrgCode/newOrgName`）。
- **行级门槛**：存在 `approval_id`（iassist_flow_data approval_status=0）→ 不可变更；`status!=3` → 不可编辑/变更；`status==4` → 不可中止。
- **列头与数据错位风险点**：export 原文件 `ecif客户编号`列实际挂 `bond_type`；export `js_remark` 取 `查询当前业务信息`；manager `related_name/dept_name` 误挂状态字典——重构时按 “列表列定义”小节修复。
- **看个人还是全行**：view/export(带creator) 看 `creator=fine_username`；manager 与 export(不带creator) 看全行（排除 0/5/6）。