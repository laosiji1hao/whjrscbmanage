# whjrscbmanage 债券业务管理系统 — 申报相关 3 页规格

> 来源 cpt（均 UTF-8）:
> - `front/business_list.cpt`（13.5 KB，业务申报列表）
> - `front/my_business_pc_add.cpt`（68.5 KB，新增/修改申报大表单）
> - `front/install_ment.cpt`（10.9 KB，还款计划弹窗）
>
> 说明：只记录 cpt 内实际存在的事实；无法解码/缺失处标注"未发现"。数据字典为 FineReport `EmbeddedTableData`，其 `RowData` 是 XOR/编码后的字节流（`CDATA` 内为不可读密文），无法直接从 cpt 解码出选项值，只能给出行数提示。

---

## 一、business_list.cpt（业务申报列表）

### 1. 页面用途与入口
- 标题（列表页标题栏/标签）：`当前用户的业务申报表的内容`（数据集名即页面主题）。
- 用途：展示**当前登录用户自己创建**、`status = 0` 的债券业务申报（草稿/待办），支持按客户名称筛选、点击行进入新增/修改申报表单弹窗、点"新增业务"打开空申报表单。
- 入口方式：cpt 内部未发现上级菜单链接（FineReport 菜单由平台外部配置），"未发现"。列表页内提供两个入口：
  - 按钮 `新增业务`（`FreeButton` 文本）→ 打开 `./my_business_pc_add.cpt`，参数 `{"id":0}`，标题 `新增业务信息`，尺寸 `1400 × 1200`。
  - 点击列表行 `customer_name`（C3 单元格）→ 名称脚本 `脚本1`，参数 `id = B3`（该行 id），打开 `./my_business_pc_add.cpt`，标题 `新增业务信息`，尺寸 `1400 × 1200`。

### 2. 数据集（TableDataMap，均连库 `whjrscbmanage`）

| 数据集名 | 类型 | 参数 | SQL | 用途 |
|---|---|---|---|---|
| 当前用户的业务申报表的内容 | DBTableData | `customer_name`（空串默认）、`fine_username`（默认 `=$fine_username` 公式） | `select * from bus_bond_business b where b.status = 0 and b.creator = '${fine_username}' ${if(len(customer_name)=0,"","and customer_name = '"+customer_name+"'")}` | 列表主体数据源；按当前用户 + status=0 过滤，可选按客户名称精确过滤 |
| 查询所有待填客户 | DBTableData | `fine_username` | `select * from bus_bond_business b where b.status = 0 and b.creator = '${fine_username}'` | 供参数面板"客户名称"下拉的数据字典（`TableDataDictionary`，ki=customer_name / vi=customer_name，选项=该用户所有 status=0 申报中的客户名称去重值） |

- `fine_username` 是报表参数，默认值为公式 `=$fine_username`（取 FineReport 会话当前登录用户名），两处 SQL 均以 `<cpt>creator = '${fine_username}'</cpt>` 参与过滤 —— 即列表**只显示当前用户本人的申报**。
- 两个数据集 SQL 实际相同，差别仅在于主数据集响应参数面板的 `customer_name` 精确过滤。

### 3. 列表展示列（无显式列标题）
- 展开格 B3（c=1,r=2）显示 `id`（DS 列 id，扩展方向 dir=0 向下）；C3（c=2,r=2，列跨 2）显示 `customer_name`，并挂"脚本1"名称脚本=点击打开弹窗（见上）。
- 页面内**未发现**列标题文本（labels 中仅参数面板的"客户名称"标签）。行的"条件属性1"高亮（ColWidthHighlightAction）无实际条件内容，属装饰遗留。

### 4. 行点击 / 按钮行为、搜索、分页
- 行点击：见"入口方式"（`myFR.dialog.create('./my_business_pc_add.cpt',{"id":id},'新增业务信息',1400,1200)`，`id=B3`）。
- 新增按钮：`myFR.dialog.create('./my_business_pc_add.cpt',{"id":0},'新增业务信息',1400,1200)`。
- 搜索：参数面板（`FormParameterUI`）含 `Label` 标签"客户名称"、`ComboBox name=customer_name`（数据字典="查询所有待填客户"，ki=vi=customer_name）、`FormSubmitButton name=Search` 文本"查询"（Hotkey `enter`）。点"查询"提交参数 → 重跑主数据集（按 customer_name 过滤）。
- 分页：未发现显式分页配置（FineReport 默认不分页）。
- 排序：未发现排序配置。

---

## 二、my_business_pc_add.cpt（新增/修改申报表）

### 1. 页面用途
- 两种模式，由报表参数 `id` 决定：列表传 `id:0` → 新增；点行传 `id = 行id`（>0）→ 修改。
- 报表参数：`cloudUrl = http://localhost:9058`、`prjId = whjrscbmanage`（供 `myFR.callCloud` 定位联云 API 用）；`JSImport = scripts/js/myFR2.js`。

### 2. 数据集（TableDataMap，连库 `whjrscbmanage`）

| 数据集名 | 类型 | 参数 | SQL | 用途 |
|---|---|---|---|---|
| 获取申报表已有业务信息 | DBTableData | `id` | `select * from bus_bond_business b where b.id = '${id}'` | 修改模式回填整张表（DS 列绑定到各表单控件）；id=0 时无行→各 DS 控件初始为空 |

其余 8 个为内嵌数据字典（`EmbeddedTableData`），详见第 4 节。

### 3. 页面初始化
- `WebWriteContent` 的 `afterload` 事件：`myFR.init()` + `myFR.dialog.afterload()`。
- 各"是否"类下拉控件（`installment_flag` / `our_bank_underwrite` / `fund_account_flag` / `supervise_account_flag` / `js_remark_flag`）各有 `afterinit` 监听：`setTimeout(...,500)` 把下拉 `setValue(0)` 并隐藏关联账号/文本控件：
  - 即**编辑已有申报时，这 5 个开关仍会被强制重设为 0，关联字段被隐藏**（cpt 事实，重构时需注意此覆盖行为）。

### 4. 数据字典清单（8 个内嵌表，RowData 均不可解码）

| 数据集名 | 列结构（ColumnNames） | 行数提示 | 被哪些控件引用（ki/vi 即 key/value 映射） |
|---|---|---|---|
| 数据字典-信用评级 | `val`（单列） | 编码单行，行数无法确认 | `ext_rating`、`int_rating`（TableDataDictionary ki=vi=val） |
| 数据字典-行业分类 | `key,,.,,value`（2列） | 编码 7 行(≈7 选项) | `industry`（ki=value vi=key） |
| 数据字典-客户分类 | `key,,.,,value`（2列） | 编码 1 行，行数不确 | `customer_type`（ki=value vi=key） |
| 数据字典-是否 | `key,,.,,value`（2列） | 编码 1 行，行数不确 | `installment_flag`、`our_bank_underwrite`、`fund_account_flag`、`supervise_account_flag`、`js_remark_flag`（均 ki=value vi=key）；`exercise_flag` 的 Present 也用 |
| 数据字典-业务品种 | `key,,.,,value`（2列） | 编码 5 行(≈5 选项) | **cpt 中无任何控件引用**（页面无"业务品种"输入项；labels 含"业务品种"但无对应 widget——字典属预留/遗留） |
| 数据字典-币种 | `key,,.,,value`（2列） | 编码 1 行，行数不确 | `currency`（ki=value vi=key） |
| 数据字典-担保情况 | `key,,.,,value`（2列） | 编码 1 行，行数不确 | `guarantee_info`（ki=value vi=key） |
| 数据字典-是否行权特殊值 | `key,,.,,value`（2列） | 编码 2 行(≈2 选项) | `exercise_flag`（ki=value vi=key） |

**被引用但本页 TableDataMap 未定义的字典/影子表**（`Present` 展示字典引用，取不到→显示原值或空）：`数据字典-国标行业`（ext_rating_date 的 Present，ki=code vi=code_name）、`数据字典-客户规模`（int_rating 的 Present，ki=val vi=name）、`机构列表`（fund_account/supervise_account 的 Present，ki=branch_no vi=branch_name2）、`用户列表`（js_remark/exercise_date 的 Present，ki=user_id vi=user_name2）。

**能从 cpt JS / CustomDictionary 直接解出的选项值**：
- `bond_type`（标准/非标准）：`0=标准化业务`、`1=非标准化业务`（CustomDictionary，硬编码）。
- `green_tech_flag`（是否绿色/科技/养老）：`0=绿色`、`1=科技`、`2=养老`、`3=不涉及`（CustomDictionary，硬编码）。
- `int_rating` → `customer_type` 联动档位（JS 硬编码数组）。
- `currency`（币种）：JS 中出现 `人民币`、`美元` 两种，其余被编码字典覆盖。
- 各"是/否"开关（是否、是否行权特殊值）：JS 统一按 `"0"` / `"1"` 比较分支（0=否/不涉及，1=是）。

### 5. 逐字段规格表

单元格坐标为 0 基 (r,c)；`*` = 该行"必填星号"标记。控件列出的 `stopedit`=编辑结束、`afterinit`=初始化后 事件内 JS 见第 6 节。

| # | 控件 name | 标签 | 类型 | 绑DS列 | 必填/校验 | 默认值/显隐/联动 | 说明 |
|---|---|---|---|---|---|---|---|
| 0 | （无控件，D1 单元格） | 编号 | 只读单元格 | `id`（获取申报表已有业务信息） | — | — | 保存按钮经 D1 读取 id 作为 businessId |
| 1 | `bond_type` | 标准/非标准 | ComboBox | — | EMSG=`必选`、allowBlank=false | 0=标准化业务 / 1=非标准化业务 | CustomDictionary 硬编码 |
| 2 | `customer_no` | 客户编号 | TextEditor | — | allowBlank=false | stopedit → callCloud 226010 ECIF 查询 | 可扫码 |
| 3 | `ecif_customer_no` | ECIF客户号 | TextEditor | — | — | stopedit → 226010 回填（见 JS） | 可扫码 |
| 4 | `customer_name` | 融资人名称 | TextEditor | customer_name | — | stopedit 由 226010 回填 | 可扫码，ECIF 自动带出 |
| 5 | `biz_name` | 项目/债券名称 | TextEditor | biz_name | — | — | 可扫码 |
| 6 | `bond_code` | 债券编号 | TextEditor | — | 行标 `*`（无 EMSG） | — | 可扫码；H4 被还款计划按钮传参引用 |
| 7 | `green_tech_flag` | 是否绿色/科技/养老 | ComboBox | — | — | 绿色/科技/养老/不涉及 | CustomDictionary |
| 8 | `ext_rating` | 外部信用评级 | ComboBox | — | — | 字典"数据字典-信用评级"，DirectEdit=false | ki=vi=val |
| 9 | `ext_rating_date` | 外部信用评级日期 | DateEditor | — | allowBlank=false | Present 引用"数据字典-国标行业"（未定义，影子） | — |
| 10 | `rating_agency` | 外部评级机构 | TextEditor | — | — | — | 可扫码 |
| 11 | `int_rating` | 内部评级 | ComboBox | int_rating | — | stopedit + afterinit → 联动 customer_type | 字典"数据字典-信用评级"；Present 引用"数据字典-客户规模"（影子） |
| 12 | `int_rating_date` | 内部评级日期 | DateEditor | int_rating_date | allowBlank=false、DirectEdit=false | — | — |
| 13 | `lead_underwriter` | 主承销商 | TextEditor | lead_underwriter | — | — | 可扫码；未绑字典（重构成下拉时注意） |
| 14 | `industry` | 行业分类 | ComboBox | — | allowBlank=false、DirectEdit=false | 字典"数据字典-行业分类"（≈7 项，不可解码） | ki=value vi=key |
| 15 | `customer_type` | 客户分类 | ComboBox | customer_type | — | **disabled=true（只读）**，由 int_rating 自动算出 0/1；字典"数据字典-客户分类" | 「第一类/第二类」见第6节 |
| 16 | `start_date` | 发放日 | DateEditor | — | allowBlank=false | — | — |
| 17 | `mature_date` | 到期日 | DateEditor | — | 行标 `*` | 行权时作为行权日期来源 | — |
| 18 | `currency` | 币种 | ComboBox | — | allowBlank=false | 字典"数据字典-币种"（含 人民币/美元…） | D11 被 orig_amount 计算引用 |
| 19 | `orig_amount` | 初始金额 | TextEditor | — | 行标 `*` | stopedit → 按币种折算 rmb_amount/balance | 见第6节（人民币×1、美元×6.8） |
| 20 | `rmb_amount` | 初始金额（折人民币） | TextEditor | — | allowBlank=false | 由 orig_amount 自动算 | 只读性质（无禁用属性但被 JS 覆盖） |
| 21 | `balance` | 业务余额（折人民币） | TextEditor | — | 行标 `*` | 由 orig_amount 自动算 | — |
| 22 | `invest_rate` | 投资利率（%） | TextEditor | — | — | — | 可扫码 |
| 23 | `transfer_rate` | 价值转移利率（%） | TextEditor | — | — | — | 可扫码 |
| 24 | `guarantee_info` | 担保情况 | ComboBox | guarantee_info | — | 字典"数据字典-担保情况" | ki=value vi=key |
| 25 | `installment_flag` | 是否涉及分期还款 | ComboBox | — | — | afterinit 强制 =0；"添加还款计划"按钮据此放行 | 字典"数据字典-是否" |
| 26 | （按钮） | 添加还款计划 | FreeButton | — | — | installment_flag="0" 时 alert `分期还款请选择是！`；否则打开 `./install_ment.cpt&row=ROW()&col=COL()&type=0`，参数 `{"bond_code":H4}`（另传 `implament=H15` 未使用），标题 `还款计划`，尺寸 `1200 × 1000` | 见第6节 |
| 27 | `installment_detail` | 还款计划明细 | TextArea | — | — | **disabled=true**；install_ment 提交后回写 H15 = "还款时间:…,还款金额:…;…" 人读串 | 展示用 |
| 28 | `installment` | （隐藏）还款计划 JSON | TextEditor | — | — | **disabled + invisible**；install_ment 提交后回写 I15 = JSON 数组 `[{installmentTime,installmentAmount}]`；保存时提交给 226006 `installment` | 落库字段载体 |
| 29 | `our_bank_underwrite` | 是否我行承销 | ComboBox | — | — | afterinit 强制 =0 | 字典"数据字典-是否" |
| 30 | `agreed_usage` | 约定资金用途 | TextEditor | agreed_usage | allowBlank=false | Present 引用"数据字典-是否"（影子，不影响录入） | — |
| 31 | `fund_account_flag` | 是否存在资金发放/募集账户账号 | ComboBox | — | — | stopedit：0 → 清空并隐藏 fund_account；afterinit 强制 0 并隐藏 | 字典"数据字典-是否" |
| 32 | `fund_account` | 资金发放/募集账户账号 | TextEditor | — | EMSG=`账号不允许为空`、allowBlank=false | stopedit → callCloud 226014 账号可用性校验 | Present 引用"机构列表"（影子） |
| 33 | `supervise_account_flag` | 是否存在资金监管/回款专户账号 | ComboBox | — | — | stopedit：0 → 清空并隐藏 supervise_account；afterinit 强制 0 并隐藏 | 字典"数据字典-是否" |
| 34 | `supervise_account` | 资金监管/回款专户账号 | TextEditor | — | EMSG=`账号不允许为空`、allowBlank=false | stopedit → callCloud 226014 账号可用性校验 | Present 引用"机构列表"（影子） |
| 35 | `remark_number` | 批复号 | TextEditor | — | allowBlank=false | — | — |
| 36 | `remark` | 批复管理要求 | TextArea | remark | — | — | 可显示多行 |
| 37 | `js_remark_flag` | 是否存在金融市场部批复管理要求 | ComboBox | — | — | stopedit：0 → 清空并隐藏 js_remark；afterinit 强制 0 并隐藏 | 字典"数据字典-是否" |
| 38 | `js_remark` | 金融市场部批复管理要求 | TextArea | — | EMSG=`金融市场部批复管理要求不允许为空` | 显示时校验 | Present 引用"用户列表"（影子） |
| 39 | `exercise_flag` | 是否行权 | ComboBox | — | — | stopedit：="1" → 显示 exercise_date 且 = mature_date；="0" → reset+隐藏 | 字典"数据字典-是否行权特殊值"（≈2 项：1/0） |
| 40 | `exercise_date` | 行权日期 | DateEditor | — | 行标 `*` | 当是行权时，行权日期=到期日期；否则不填 | Present 引用"用户列表"（影子） |
| 41 | （按钮） | 保存/确定 | FreeButton | — | — | iconName=submit，cell 标签"保存"，按钮文字"确定" | 点击 → callCloud 226006（见第6节） |

小计：39 个输入型控件 + 2 个功能按钮 + 1 个只读 id 单元格。合并行展示的"客户经理"（labels）仅为 226006 参数 `inspectorPost: "客户经理"`，非独立字段。

### 6. JS 逻辑

- `myFR.callCloud` 签名（本页用法）：`myFR.callCloud(apiCode, params, successCb, errorCb, asyncFlag)`。

#### a) ECIF 客户号/客户名称联动 — API `226010`
- 触发：`customer_no` 的 stopedit（客户编号编辑结束）（`ecif_customer_no` 的 stopedit 仅一个空 `if()`，功能在 customer_no 上）。
- 请求参数：`{ custNo: v("customer_no") }`。
- 响应字段：`data.ecifCustomerNo`、`data.customerName`。逻辑：
  - 返回空 → 不覆盖，若页面上已有值则 `FR.Msg.alert('提示','该客户编号查询的ECIF客户号不存在')` / `'该客户编号查询的客户名称不存在'`；
  - 返回值，若与页面上已填值不一致 → `FR.Msg.confirm('提示', 'ECIF客户号已在页面上填写为【xx】，与查询结果【yy】不一致，是否以此为准？', ...)`，点 `ok` 才覆盖；
  - 一致或页面为空 → 直接 `setValue` 到 `ecif_customer_no` 和 `customer_name`。

#### b) 内部评级 → 客户分类（只读）联动
- `int_rating` stopedit + afterinit(500ms)：`int_rating ∈ ['AAA+','AAA','AAA-']` → `customer_type=0`（第一类）；`int_rating ∈ ['AA+','AA','AA-','A+','A','A-','BBB+']` → `customer_type=1`（第二类）。
- 原 JS 含 `A` 后缀残留（`.indexOf(...) !== -1` 后接 `A`），属存储损坏/复制残留；行为按正常 JS 推断，重构时应清除。

#### c) 初始金额 → 折人民币/余额 计算
- `orig_amount` stopedit，参数 `currency =D11`（币种）、`orig_amount =H11`（自身）：
  - `currency == "人民币"` → `rmb_amount = orig_amount`、`balance = orig_amount`；
  - `currency == "美元"` → 两者 `= (orig_amount * 6.8).toFixed(2)`（固定汇率 6.8，硬编码）。

#### d) 账户可用性校验 — API `226014`（两个账号各一次）
- `fund_account`、`supervise_account` 的 stopedit：`myFR.callCloud("226014", { acctNo: 账号 }, ...)`。
- 成功回调：`data.status != "AS00"` → `FR.Msg.alert('提示','该账号不可用，查询结果为'+data.statusTxt)` 并 `reset()` 清空该账号。
- 失败回调：`FR.Msg.toast("账户不可用")` 并 `reset()`。

#### e) 添加还款计划（打开 install_ment）
- `installment_flag == "0"` → `alert("分期还款请选择是！")`，拦截。
- 否则 `myFR.dialog.create('./install_ment.cpt&row='+row+'&col='+col+'&type=0', {"bond_code":bond_code}, '还款计划', 1200, 1000)`；`bond_code=H4`，query 串携带 `row`、`col`、`type=0`（install_ment 内部实际只读 type）。

#### f) 保存 / 提交 — API `226006`
- 触发：`确定` 按钮（icon submit），参数 `id =D1`。
- 计算 `inspect_freq`：`customer_type` 为 `"0"` 或 `"1"` → `3`，否则 `1`。
- 请求参数（完整清单，cpt 字段 → API 参数名）：
  ```
  businessId=D1(id), bondCode, ecifCustomerNo, customerNo, customerName, bizName,
  bondType, greenTechFlag, extRating, extRatingDate, ratingAgency, intRating,
  intRatingDate, industry, customerType, startDate, matureDate, currency, origAmount,
  rmbAmount, balance, investRate, transferRate, guaranteeInfo, installmentFlag,
  installment(即 I15 隐藏 JSON), ourBankUnderwrite, agreedUsage, fundAccount,
  fundAccountFlag, superviseAccount, superviseAccountFlag, drawdownCheck, exerciseFlag,
  exerciseDate, remarkNumber, remark, jsRemark, jsRemarkFlag, leadUnderwriter,
  inspectFreq(=computed), inspectorPost="客户经理"
  ```
  共 42 个参数（businessId 在内）。注意 `drawdownCheck: v("drawdown_check")` —— 页面**不存在**名为 `drawdown_check` 的控件（将提交空串；重构时确认是否应映射到某个账号存在标识）。
- 成功后：`window.parent.FR.Msg.toast("新增业务业务信息审批中")`；被注释掉的 `closeDialog()` + `contentPane.parameterCommit()` 显示原设计为关窗并刷新父列表。
- 还款计划落库：226006 仅把 `installment`（I15 的 JSON 数组 `[{installmentTime,installmentAmount}]`）作为普通字段提交；**本 3 页内没有对 `bus_repayment_schedule` 的直接写库/专门 API**（`bus_repayment_schedule` 只是 install_ment 读回去回填）。

---

## 三、install_ment.cpt（还款计划弹窗）

### 1. 页面用途
- 查看/编辑还款计划明细：被 `my_business_pc_add.cpt` 的"添加还款计划"打开（type=0，新增申报场景）；也可被其他页面用 type=1（查看/展示场景，回写父页 H18/I18——本 3 页范围内无此调用方，"未发现具体调用页"）。
- 报表参数：`bond_code`（模板参数，来自 URL/弹窗参数，不显示到参数面板）。
- `WebWriteContent`：`UnloadCheck check="false"`、`ShowWidgets show="true"`。

### 2. 数据集
- `ds1`（唯一，DBTableData，连库 `whjrscbmanage`）：
  - 参数：`bond_code`；
  - SQL：`select * from bus_repayment_schedule b where b.bond_code = '${bond_code}' and b.status = 2`
  - 用途：打开弹窗时按债券编号读取已存在的还款计划（status=2）回填可编辑行（修改已有计划场景）；新申报 bond_code 为空时 ds1 为空 → 空表格手输。

### 3. 表格列 / 字段（无"序列号"列）
| 单元格 | 列头文本 | 数据控件（name, 类型） | 绑DS列 |
|---|---|---|---|
| B4（r3,c1） | 还款时间 | — | — |
| C4（r3,c2） | 还款金额 | — | — |
| B5（r4,c1） | — | `installmentTime` DateEditor | ds1.repayment_date |
| C5（r4,c2） | — | `installmentAmount` NumberEditor | ds1.repayment_amount |
| D5（r4,c3） | 插入行 | `AppendRowButton`（FixCell row4 col1） | — |
| E5（r4,c4） | 删除行 | `DeleteRowButton`（FixCell row4 col1） | — |
| C8（r7,c2） | 关闭 | FreeButton → `window.parent.FR.closeDialog()` | — |
| D8（r7,c3） | 提交 | FreeButton → 汇总 JS（见下） | — |

- 行控件随行扩展（追加行后每行都是同名的 `installmentTime` / `installmentAmount` 实例，JS 用 `getWidgetsByName` 收合集）。

### 4. 增删行、保存行为
- 增删行：内置 `AppendRowButton`（插入行）/ `DeleteRowButton`（删除行），固定附加在数据行（FixCell row4 col1）。
- "提交" JS（`点击1`）逻辑：
  1. `getWidgetsByName("installmentTime")` / `getWidgetsByName("installmentAmount")` 收集所有行值 → 组装数组 `list`；
  2. `listStr = JSON.stringify(list)`（形如 `[{"installmentTime":"..","installmentAmount":".."},...]`）；`result` 人读串 = `"还款时间:..,还款金额:..;..."`（后接 `;` 拼接）；
  3. 读 URL 参数 `type`（`getUrlParam`）：
     - `type=='1'` → 回写父页 `H18`=result、`I18`=listStr；
     - `type=='0'` → 回写父页 `H15`=result、`I15`=listStr；
  4. `window.parent.FR.closeDialog()`。
- **type 是否只读**：cpt/JS 内**未发现**按 `type` 禁用行控件、隐藏增删行按钮的任何逻辑——弹窗内两种 type 均可编辑；type 仅决定回写父页的目标单元格（0→新增申报 H15/I15，1→查看页 H18/I18）。重构时如需"查看时只读"，须由外层页面控制或新增开关。
- **保存到哪个库表 / 是否差异写入**：install_ment **不直接写库、不调任何云 API**；只是把整表（当前可见全部行，非差异）写回父页两个单元格（人读串 + JSON）。父页 226006 保存时再把 JSON（`installment`）落 `bus_bond_business`。`bus_repayment_schedule` 仅被 ds1 读取用于回填。"差异写入"逻辑未发现（整体覆盖式回写）。

---

## 附：发现的联云 API 汇总

| API 码 | 用途 | 请求参数 | 关键响应字段/行为 |
|---|---|---|---|
| 226006 | 新增/更新业务申报（保存） | businessId 等 42 字段（见二.6.f） | 成功 toast `新增业务业务信息审批中` |
| 226010 | ECIF 客户信息查询（客户编号→ECIF客户号+客户名称） | `custNo` | `ecifCustomerNo`、`customerName`；不一致弹 confirm，空返回仅提示 |
| 226014 | 账号可用性校验 | `acctNo` | `status == "AS00"` 可用；`status` 非 AS00 提示 `该账号不可用，查询结果为+statusTxt`；异常 toast `账户不可用` 并清空 |

---

## 展望清单（重构要点速记）
- 列表页：2 数据集（内容 + 下拉字典）、无列头两列表（id + customer_name）、点行/按钮开 1400×1200 弹窗、customer_name 精确筛选。
- 表单页：39 控件 + 2 按钮；8 个内嵌字典（均密文，值域需从后台/实际运行确认），4 个影子字典引用待清理，`drawdown_check` 无控件但提交；5 个"是否"开关编辑态会被 afterinit 强制归 0（历史行为，重构需确认取舍）；汇率 6.8 硬编码；`inspectFreq` 由客户分类推导。
- 还款计划弹窗：2 行控件 + 内置增删行；提交仅回写父页单元格（H15/I15 或 H18/I18），JSON 串经父页保存落 `bus_bond_business.installment`；无只读模式。