# 债券业务管理系统（whjrscbmanage）前端 cpt 规格 —— 分期申报 / 查看我的申报（look / look_busimanage）

> 来源文件（E:\wh_projects\whjrscbmanage\whjrscbmanage\front\）：
> - `my_business_pc_installment.cpt`（71,949 字节，UTF-8）
> - `my_business_pc_look.cpt`（100,742 字节）
> - `my_business_pc_look_busimanage.cpt`（100,627 字节）
> - 对照文件 `my_business_pc_add.cpt`（68,543 字节）
> 已逐一 Read 四个 cpt 全文并做了逐字段/逐 JS diff。所有事实均来自文件原文，未能确认项标注"未发现"。

---

## 一、my_business_pc_installment.cpt —— "分期"申报表单

### 1.1 页面用途

- 与 `my_business_pc_add.cpt`（新增业务申报）**字段集合几乎完全一致**，是同一个申报表单的"分期"变体。
- 页面从 `my_business_pc_view.cpt` 以按钮"创建分期"打开（`my_business_pc_view.cpt:1248`：`myFR.dialog.create('./my_business_pc_installment.cpt', {...})`），打开即传入某业务的 id。本页按该 id 用数据集 `获取申报表已有业务信息` 查到已有申报行并**回填全部字段**。
- 与 add 的最大区别：**全表单 38 个字段全部绑定数据集回填**（add 只绑定 10 个字段）；保存走同一云 API `226006`，但 `businessId` 传**空字符串**（走新增/创建分支），toast 提示"创建分期业务信息审批中"。
- 因此它应理解为"**基于已有申报创建一个涉及分期还款的业务申报（创建分期）**"，而不是 add 页本身。注意：本页**没有任何字段让 `installment_flag` 默认=是**，它直接读库里的 `installment_flag` 值；"添加还款计划"按钮才会校验 `installment_flag=="0"` 时阻止。

> 无法确认（未在 cpt 内出现）：本页号 `my_business_pc_installment` 只在 view 页被引用，add 页不直接链到本页。

### 1.2 数据集

| 数据集名 | 类型 | 参数 | SQL |
|---|---|---|---|
| 获取申报表已有业务信息 | DBTableData (whjrscbmanage) | `id`（默认值 `1`，add 默认空） | `select * from bus_bond_business b where b.id = '${id}'` |
| 数据字典-信用评级 | EmbeddedTableData | - | 单列 `val`（值内嵌，见 §1.2.1） |
| 数据字典-行业分类 | EmbeddedTableData | - | 列 `key,,.,,value` |
| 数据字典-客户分类 | EmbeddedTableData | - | 列 `key,,.,,value` |
| 数据字典-是否 | EmbeddedTableData | - | 列 `key,,.,,value` |
| 数据字典-业务品种 | EmbeddedTableData | - | 列 `key,,.,,value`（本页**未被 widgets 引用**，add 亦然） |
| 数据字典-币种 | EmbeddedTableData | - | 列 `key,,.,,value` |
| 数据字典-担保情况 | EmbeddedTableData | - | 列 `key,,.,,value` |
| 数据字典-是否行权特殊值 | EmbeddedTableData | - | 列 `key,,.,,value` |

#### 1.2.1 数据字典值说明
- 所有 EmbeddedTableData 的 `RowData` 均以帆软内部序列化形式内嵌（文件内为 `F*)NRk&PQc"CYRg#_rf3...` 一类不可直读字节），**无法直接从 cpt 明文读出 key=value 清单**，只能确认字典存在并被哪些控件引用（引用关系见 §1.3 下拉选项列）。"数据字典-业务品种"在本页被声明但**无任何控件引用**。

### 1.3 逐字段规格表（installment，行/列位同 add：label 在列 B/F，值在列 D/H）

| 位置 | 控件名 | 标签 | 类型 | 下拉选项 | 默认/必填 | 备注/联动 |
|---|---|---|---|---|---|---|
| B1 | id（无控件，D1 DS 绑定 id） | 编号 | DS 文本 | - | - | 保存按钮参数 `=D1` |
| B2 | bond_type | 标准/非标准 | ComboBox | 0=标准化业务, 1=非标准化业务（CustomDictionary，输入与显示同） | EMSG 必选, allowBlank=false | 绑定 DS |
| F2 | customer_no | 客户编号 | TextEditor | - | EMSG 必选?（allowBlank=false） | stopedit→ECIF 226010；绑定 DS |
| B3 | ecif_customer_no | ECIF客户号 | TextEditor | - | 无 allowBlank | 绑定 DS |
| F3 | customer_name | 融资人名称 | TextEditor | - | 无 | 绑定 DS；ECIF 联动手动设置 |
| B4 | biz_name | 项目/债券名称 | TextEditor | - | 无 | 绑定 DS |
| F4 | bond_code | 债券编号 | TextEditor | - | 无 | 绑定 DS；"添加还款计划"按钮用 `=H4` 读它 |
| B5 | green_tech_flag | 是否绿色/科技/养老 | ComboBox | 0=绿色,1=科技,2=养老,3=不涉及（CustomDictionary） | 无 allowBlank | 绑定 DS |
| F5 | ext_rating | 外部信用评级 | ComboBox | 数据字典-信用评级（kiName/viName=val） | 无（DirectEdit=false） | 绑定 DS |
| B6 | ext_rating_date | 外部信用评级日期 | DateEditor | - | allowBlank=false | 绑定 DS；Present 用"数据字典-国标行业"（外部表） |
| F6 | rating_agency | 外部评级机构 | TextEditor | - | 无 | 绑定 DS |
| B7 | int_rating | 内部评级 | ComboBox | 数据字典-信用评级 | DirectEdit=false | 绑定 DS；stopedit→customer_type（见 §1.5.3） |
| F7 | int_rating_date | 内部评级日期 | DateEditor | - | allowBlank=false, DirectEdit=false | 绑定 DS |
| B8 | lead_underwriter | 主承销商 | TextEditor | - | 无 | 绑定 DS |
| B9 | industry | 行业分类 | ComboBox | 数据字典-行业分类（value→key） | allowBlank=false, DirectEdit=false | 绑定 DS |
| F9 | customer_type | 客户分类 | ComboBox | 数据字典-客户分类（value→key） | **disabled=true** | 绑定 DS；由 int_rating 联动写 0/1 |
| B10 | start_date | 发放日 | DateEditor | - | allowBlank=false | 绑定 DS |
| F10 | mature_date | 到期日 | DateEditor | - | 无 | 绑定 DS |
| B11 | currency | 币种 | ComboBox | 数据字典-币种（value→key） | allowBlank=false | 绑定 DS |
| F11 | orig_amount | 初始金额 | TextEditor | - | 无 | 绑定 DS；stopedit→rmb_amount/balance 换算（§1.5.4）；参数 `=D11`/`=H11` |
| B12 | rmb_amount | 初始金额（折人民币） | TextEditor | - | allowBlank=false | 绑定 DS |
| F12 | balance | 业务余额（折人民币） | TextEditor | - | 无 | 绑定 DS |
| B13 | invest_rate | 投资利率（%） | TextEditor | - | 无 | 绑定 DS |
| F13 | transfer_rate | 价值转移利率（%） | TextEditor | - | 无 | 绑定 DS |
| B14 | guarantee_info | 担保情况 | ComboBox | 数据字典-担保情况（value→key） | 无 | 绑定 DS |
| F14 | installment_flag | 是否涉及分期还款 | ComboBox | 数据字典-是否（value→key） | DirectEdit=false | 绑定 DS；**无 afterinit 默认**（add 有默认置 0） |
| B15 | （按钮，FreeButton 文本"添加还款计划"） | 还款计划 | FreeButton | - | - | click：installment_flag=="0"→alert"分期还款请选择是！"；否则开 `./install_ment.cpt&row=R&col=C&type=0`，参数 `{"bond_code":=H4}`（§1.5.5） |
| F15 | installment_detail | 还款计划明细 | TextArea | - | disabled=true | **不绑定 DS**；install_ment type=0 写父页 H15 |
| I15 | installment | （隐藏） | TextEditor | - | disabled=true, invisible=true | **不绑定 DS**；install_ment type=0 写父页 I15=JSON |
| B16 | our_bank_underwrite | 是否我行承销 | ComboBox | 数据字典-是否（value→key） | 无 | 绑定 DS |
| F16 | agreed_usage | 约定资金用途 | TextEditor | - | allowBlank=false | 绑定 DS |
| B17 | fund_account_flag | 是否存在资金发放/募集账户账号 | ComboBox | 数据字典-是否（value→key） | DirectEdit=false | 绑定 DS；stopedit→显隐 fund_account（§1.5.6） |
| F17 | fund_account | 资金发放/募集账户账号 | TextEditor | - | **无 EMSG/无 allowBlank**（add 有"账号不允许为空"+allowBlank=false） | 绑定 DS；stopedit→226014（installment 版**无 status 校验**，只 console.log，见 §1.5.2） |
| B18 | supervise_account_flag | 是否存在资金监管/回款专户账号 | ComboBox | 数据字典-是否（value→key） | 无 | 绑定 DS；stopedit→显隐 supervise_account |
| F18 | supervise_account | 资金监管/回款专户账号 | TextEditor | - | **无 EMSG/无 allowBlank** | 绑定 DS；stopedit→226014 **含 `data.status!="AS00"` 校验** |
| B19 | remark_number | 批复号 | TextEditor | - | allowBlank=false | 绑定 DS |
| F19 | remark | 批复管理要求 | TextArea | - | 无 | 绑定 DS |
| B20 | js_remark_flag | 是否存在金融市场部批复管理要求 | ComboBox | 数据字典-是否（value→key） | beforeedit→setValue(0)（初始默认否） | 绑定 DS；stopedit→显隐 js_remark |
| F20 | js_remark | 金融市场部批复管理要求 | TextArea | - | 无（**无 EMSG**） | 绑定 DS |
| B21 | exercise_flag | 是否行权 | ComboBox | 数据字典-是否行权特殊值（value→key） | DirectEdit=false | 绑定 DS；stopedit→行权日期联动（§1.5.7） |
| F21 | exercise_date | 行权日期 | DateEditor | - | 无 | 绑定 DS |
| F23 | （保存按钮"确定"） | 保存 | FreeButton (icon submit) | - | - | callCloud 226006（§1.5.8） |

### 1.4 与 my_business_pc_add.cpt 的逐字段差异表（重点）

> "DS 绑定"指该控件所在单元格是否带 `<O t="DSColumn">` 回填。add 绑定列清单（grep 实证共 10 个）：`id, bond_type, customer_name, biz_name, int_rating, int_rating_date, lead_underwriter, customer_type, guarantee_info, agreed_usage`。
> installment 绑定列清单（grep 实证 38 个）：除 `installment_detail`/`installment` 两个展示控件外**全部绑定**。

| 字段/控件 | add.cpt | installment.cpt | 差异说明 |
|---|---|---|---|
| 数据集参数 id 默认值 | 空 `''` | `'1'` | 默认值不同 |
| customer_no | **不绑 DS**（仅控件） | **绑定 DS**（columnName=customer_no） | add 打开已存在 id 时该框空白；installment 回填 |
| ecif_customer_no | 不绑 DS；stopedit 有**残缺 JS**：`function v(name){...} if()`（语法不完整） | 绑定 DS；无 listener | add 的该 listener 是坏的 |
| bond_code | 不绑 DS | 绑定 DS | 同 customer_no 类 |
| green_tech_flag | 不绑 DS | 绑定 DS | 同 |
| ext_rating / ext_rating_date / rating_agency | 不绑 DS | 全部绑定 DS | 同 |
| industry | 不绑 DS | 绑定 DS | 同 |
| start_date / mature_date | 不绑 DS | 绑定 DS | 同 |
| currency / orig_amount / rmb_amount / balance / invest_rate / transfer_rate | 不绑 DS | 全部绑定 DS | 同 |
| installment_flag | 不绑 DS；**afterinit 置 0**（`setTimeout(500)` `setValue("0")`） | 绑定 DS；无 afterinit | add 强制默认"否"；installment 读库值 |
| our_bank_underwrite | 不绑 DS；**afterinit 置 0** | 绑定 DS；无 afterinit | 同 |
| fund_account_flag | 不绑 DS；stopedit + **afterinit 置 0 并隐藏 fund_account** | 绑定 DS；仅 stopedit | add 初始隐藏 |
| fund_account | 不绑 DS；stopedit→226014 **带 `if(data.status != "AS00")` 校验**；EMSG"账号不允许为空"+allowBlank=false | 绑定 DS；stopedit→226014 **只 console.log(data)，无 status 校验**；无 EMSG/allowBlank | **校验行为不同**（add 更严格） |
| supervise_account_flag | 不绑 DS；stopedit + afterinit 置 0 并隐藏 | 绑定 DS；仅 stopedit | 同 |
| supervise_account | 不绑 DS；stopedit→226014 带 status 校验；EMSG+allowBlank=false | 绑定 DS；stopedit→226014 带 status 校验；无 EMSG/allowBlank | 校验同，校验提示缺 |
| remark_number / remark / js_remark_flag / js_remark | 不绑 DS；js_remark_flag afterinit 置 0 并隐藏 | 全部绑定 DS；js_remark_flag 用 **beforeedit** 置 0（无 afterinit） | js_remark_flag 初始化机制不同 |
| js_remark | 有 EMSG"金融市场部批复管理要求不允许为空" | 无 EMSG | add 有必填提示 |
| exercise_flag / exercise_date | 不绑 DS | 绑定 DS | 同 |
| int_rating | 绑定 DS；listener **stopedit + afterinit**（afterinit 在 500ms 重算 customer_type） | 绑定 DS；仅 stopedit | **installment 载入时不会根据已存 int_rating 重算 customer_type** |
| customer_type | 绑定 DS；disabled=true；DirectEdit=false+CustomData=false | 绑定 DS；disabled=true；无 DirectEdit/CustomData | 基本一致 |
| 添加还款计划按钮 | 参数 bond_code(H4)、row、col、`implament(=H15)`；type=0 | 参数 row、col、bond_code(H4)；**无 implament 参数**；type=0 | 行为一致，参数名少一个（H15 的 implament 未用到） |
| **保存 226006** | `"businessId": id`（=D1） | `"businessId": ""`（**写死空串**，点号 =D1 参数即使传入也不使用） | 创建语义不同：add 若带 id 是更新；installment 恒为新建 |
| **保存字段** | `"installment": v("installment")` | `"installmentPlan": v("installment_plan")` | **installment 页没有名为 installment_plan 的控件**（唯一相关控件是隐藏的 `installment`），故该 JSON **恒为空串发给后端**（疑似潜在 bug） |
| 保存 drawdown_check | `v("drawdown_check")`（本页无该控件） | `v("drawdown_check")`（本页也无该控件） | 两页都有此"读空" |
| 保存 toast | `新增业务业务信息审批中` | `创建分期业务信息审批中` | 提示文案不同 |
| cloudUrl 模板参数 | `http://localhost:9058`（**写死本地地址**） | `="http://" + $cloud_service_ip`（模板参数） | installment 使用全局参数，add 是开发态硬编码 |
| listener 统计 | 6 afterinit + 10 stopedit + 2 click + 1 afterload | **0 afterinit** + 9 stopedit + 1 beforeedit + 2 click + 1 afterload | 见上 |

### 1.5 JS 逻辑（原文引用 ≤5 行）

#### 1.5.1 ECIF 客户号/名称联动（customer_no 的 stopedit）
```js
myFR.callCloud("226010", { custNo: v("customer_no") }, function(data){ ... });
```
逻辑：返回 `ecifCustomerNo`/`customerName` 为空仅提示不覆盖；有值时若与页面已填不一致 `FR.Msg.confirm` 询问"是否以此为准？（ok 才覆盖）"，一致直接 `setValue`。add/installment/look 三者该段**逐字一致**。

#### 1.5.2 账号校验
- fund_account stopedit（installment）：`myFR.callCloud("226014", { acctNo: fund_account }, function(data){ console.log(data); }, function(){ FR.Msg.toast("账户不可用"); reset(); }, true);` —— 只输出日志，不判状态。
- supervise_account stopedit（installment/look/add）：`if(data.status != "AS00"){ FR.Msg.alert('提示','该账号不可用，查询结果为'+data.statusTxt); reset(); }`，失败回调 `FR.Msg.toast("账户不可用"); reset();`。
- add 的 fund_account 同 supervise_account（带 AS00 校验），installment 的 fund_account 缺。

#### 1.5.3 内部评级→客户分类（int_rating stopedit）
```js
var classOneRatings = ['AAA+','AAA','AAA-']A;
var classTwoRatings = ['AA+','AA','AA-','A+','A','A-','BBB+']A;
if (classOneRatings.indexOf(int_rating) !== -1) customer_type.setValue(0);
else if (classTwoRatings.indexOf(int_rating) !== -1) customer_type.setValue(1);
```

#### 1.5.4 币种→折算（orig_amount stopedit；参数 `=D11`(currency)、`=H11`(orig_amount)）
```js
if (currency == "人民币") { rmb_amount.setValue(orig_amount); balance.setValue(orig_amount); }
else if (currency == "美元") { rmb_amount.setValue((orig_amount*6.8).toFixed(2)); balance.setValue(...); }
```
（look 版同此，只折算 rmb_amount，不再写 balance。）

#### 1.5.5 添加还款计划弹窗（installment/add 一致，type=0）
```js
myFR.dialog.create('./install_ment.cpt&row='+row+'&col='+col+'&type=0',
    {"bond_code":bond_code}, '还款计划', 1200, 1000)
```
`install_ment.cpt` 中 JS（scratch `install_ment.js1.txt`）读到 type：`type=='1'`→写父页 H18/I18；`type=='0'`→写父页 H15/I15。installment 页 type=0 → H15=installment_detail（TextArea 明细文本）、I15=installment（隐藏 TextEditor，JSON）。
> 注意：installment 页保存读 `v("installment_plan")` 而不是 `v("installment")`，与 type=0 写入的控件名（installment）**不匹配**（见 §1.4）。

#### 1.5.6 账户显隐联动（fund_account_flag / supervise_account_flag stopedit）
```js
if(fund_account_flag == "0"){ fund_account.setValue(""); fund_account.setVisible(false); } else { fund_account.setVisible(true); }
```
（look 的 supervise_account_flag 额外联动 fund_used_flag，见 §2.6。）

#### 1.5.7 行权联动（exercise_flag stopedit）
```js
if(exercise_flag == "1"){ exercise_date.setVisible(true); exercise_date.setValue(mature_date); }
else if(exercise_flag == "0"){ exercise_date.reset(); exercise_date.setVisible(false); }
```

#### 1.5.8 保存 226006（installment）
```js
var inspect_freq = (v("customer_type")=="0"||v("customer_type")=="1") ? 3 : 1;
myFR.callCloud("226006", { "businessId": "", "bondCode": v("bond_code"), ... };
```
发送字段清单（installment 版 37 个）：
`businessId,bondCode,ecifCustomerNo,customerNo,customerName,bizName,bondType,greenTechFlag,extRating,extRatingDate,ratingAgency,intRating,intRatingDate,industry,customerType,startDate,matureDate,currency,origAmount,rmbAmount,balance,investRate,transferRate,guaranteeInfo,installmentFlag,installmentPlan,ourBankUnderwrite,agreedUsage,fundAccount,fundAccountFlag,superviseAccount,superviseAccountFlag,drawdownCheck,exerciseFlag,exerciseDate,remarkNumber,remark,jsRemark,jsRemarkFlag,leadUnderwriter,inspectFreq,inspectorPost("客户经理")`。
回调仅 `window.parent.FR.Msg.toast("创建分期业务信息审批中")`（closeDialog/parameterCommit 被注释掉）。

---

## 二、my_business_pc_look.cpt 与 my_business_pc_look_busimanage.cpt —— "查看我的申报"

### 2.1 页面用途

- 两页为同一业务"查看我的申报"的**两个角色变体**：不带 `_busimanage` 的是普通申报人（客户经理），带 `_busimanage` 的是**业务管理岗**。
- 打开方式：由条目列表页点击进入，URL 携带主键 `id`；页面按 `id` 从 `bus_bond_business` 拉当前业务信息，**总体是一个"变更申请"表单**（并非纯只读：大部分字段可编辑，`bond_code`、`drawdown_check`、`creator`、`org_name` 设为 disabled），保存调 226007 走"申请变更业务信息审批中"。
- **页面本身不含 creator 过滤 SQL**。数据集 `查询当前业务信息` 只按 `id` 查；"查看谁的申报/是否按 creator 过滤"由列表页决定，本页**未发现** creator 过滤逻辑。"所属客户经理（creator）/所属机构（org_name）"只做 disabled 展示。
- 两页**都没有** `busimanage` URL/报表参数，也**没有** `fine_role` 判断。两页间真正的行为差异只有**保存时 `updaterType`：look=0，busimanage=1**（后端用此区分角色工作流）。文件名的 `_busimanage` 后缀 + `updaterType=1` 是唯一的"管控岗"标记。

### 2.2 数据集清单（look 与 busimanage 完全一致）

| 数据集名 | 类型 | 参数 | SQL / 来源 |
|---|---|---|---|
| 查询当前业务信息 | DBTableData | `id`（默认空） | `select * from bus_bond_business b where b.id = '${id}'` —— 页面主数据源 |
| 查询当前通道费计算配置 | DBTableData | 无 | `select * from bus_upper_storage_config` —— 只取第 1 行的 coupon_rate/vat/surcharge 三个隐藏单元格 |
| 查询当前业务的还款计划 | DBTableData | `id`（默认空） | `SELECT GROUP_CONCAT(CONCAT_WS(',', CONCAT('还款时间:',IFNULL(repayment_date,'无')), CONCAT('还款金额:',IFNULL(repayment_amount,'无'))) SEPARATOR ';') AS repayment_info, JSON_ARRAYAGG(JSON_OBJECT('installmentTime', DATE_FORMAT(repayment_date,'%Y-%m-%d'), 'installmentAmount', CAST(repayment_amount AS UNSIGNED))) AS installment_list FROM bus_bond_business bbb LEFT JOIN bus_repayment_schedule b ON b.bond_code = bbb.bond_code COLLATE utf8mb4_general_ci AND b.status = '2' WHERE bbb.id = '${id}'` |
| 数据字典-信用评级 / 客户分类 / 是否 / 业务品种 / 币种 / 担保情况 / 五级分类 / 所属管理条线 / 对应初室 / 是否绿色 / 行业分类 / 是否行权特殊值 | EmbeddedTableData | - | 内嵌字典（值不可直读，见 §1.2.1） |

> 任务提及的"获取配置参数"数据集：**未发现**。"通道费计算配置"即上面"查询当前通道费计算配置"。

### 2.3 页面结构（行 0–30）

1. **业务信息展示/编辑区**：第 1–16、18–29 行，左右两列（label 列 B/F，值列 D/H），除 disabled 项外均可编辑。
2. **还款计划区**：第 17 行 —— 左侧"还款计划"+"添加还款计划"按钮（FreeButton）；右侧"还款计划明细"`installment_detail`（TextArea，disabled，绑定 DS `repayment_info`）+ 隐藏 `installment`（TextArea，绑定 DS `installment_list`）。
3. **通道费计算配置**：第 7–8 行的"是否有通道费 / 通道费金额(%) / 上存利率(%)" + 第 6–8 行 J 列隐藏计算单元 `coupon_rate(vat/surcharge)`（来自 `bus_upper_storage_config`，J7/J8/J9）。
4. **操作按钮**：第 30 行右侧"确定"保存按钮（FreeButton，icon submitall）。

### 2.4 逐字段规格表（look；busimanage 字段一致，差异见 §2.7）

单元格坐标：label 列 B(lines 标签)/F；输入值列 D/H；J 列为隐藏计算单元。

| 位置 | 控件名 | 标签 | 类型 | 下拉选项 | 只读/必填 | 备注/联动 |
|---|---|---|---|---|---|---|
| B1 | id（DS 显示，无控件） | -（无"编号"文字标签） | DS 文本 | - | - | 保存按钮取 `=B1` |
| B2 | bond_type | 标准/非标准 | ComboBox | 0=标准化业务,1=非标准化业务（Custom） | EMSG 必选, allowBlank=false | - |
| H2 | customer_no | 客户编号 | TextEditor | - | EMSG 必选, allowBlank=false | stopedit→226010 ECIF |
| D3 | ecif_customer_no | ECIF客户号 | TextEditor | - | EMSG 必选, allowBlank=false | - |
| H3 | customer_name | 融资人名称 | TextEditor | - | EMSG 必选, allowBlank=false | - |
| D4 | biz_name | 项目/债券名称 | TextEditor | - | - | - |
| H4 | bond_code | 债券编号 | TextEditor | - | **disabled=true** | "添加还款计划"用 `=H4` |
| D5 | green_tech_flag | 是否绿色/科技/养老 | ComboBox | 输入：Custom 0/1/2/3；**显示：数据字典-是否绿色**(value→key) | EMSG 必选, allowBlank=false, DirectEdit=false | Present 字典与 add/installment 不同（add/installment 显示也用 Custom） |
| H5 | ext_rating | 外部信用评级 | ComboBox | 数据字典-信用评级 | EMSG 必选, allowBlank=false | - |
| D6 | ext_rating_date | 外部信用评级日期 | DateEditor | - | allowBlank=false | Present 数据字典-国标行业 |
| H6 | rating_agency | 外部评级机构 | TextEditor | - | - | - |
| D7 | int_rating | 内部评级 | ComboBox | 数据字典-信用评级 | EMSG 必选, allowBlank=false | stopedit→customer_type |
| H7 | int_rating_date | 内部评级日期 | DateEditor | - | EMSG 必选, allowBlank=false | - |
| **J7** | coupon_rate（无控件，隐藏单元格） | - | DS 列 | - | - | 来自"查询当前通道费计算配置" |
| D8 | lead_underwriter | 主承销商 | TextEditor | - | - | - |
| H8 | is_passage | 是否有通道费 | ComboBox | 数据字典-是否（value→key） | DirectEdit=false | stopedit→算上存利率（参数 coupon_rate=J7, vat=J8, surcharge=J9） |
| **J8** | vat（隐藏单元格） | - | DS 列 | - | - | 来自 config |
| D9 | passage_amount | 通道费金额(%) | **NumberEditor**（maxDecimalLength=6, allowNegative=false） | - | - | stopedit→算上存利率（invest_rate-vat-surcharge-passage_amount） |
| H9 | upper_storage_rate | 上存利率(%) | **NumberEditor**（maxDecimalLength=6, allowNegative=false） | - | allowBlank=false | 由 is_passage/passage_amount 联动写 |
| **J9** | surcharge（隐藏单元格） | - | DS 列 | - | - | 来自 config |
| D10 | industry | 行业分类 | ComboBox | 数据字典-行业分类 | allowBlank=false | - |
| H10 | customer_type | 客户分类 | ComboBox | 数据字典-客户分类 | **可编辑（非 disabled，不同于 add/installment）** | - |
| D11 | alert_customer | 是否我行预警客户 | ComboBox | 数据字典-是否 | - | - |
| H11 | biz_type | 业务品种 | ComboBox | 数据字典-业务品种 | - | - |
| D12 | start_date | 发放日 | DateEditor | - | allowBlank=false | - |
| H12 | mature_date | 到期日 | DateEditor | - | - | - |
| D13 | currency | 币种 | ComboBox | 数据字典-币种 | allowBlank=false | - |
| H13 | orig_amount | 初始金额 | NumberEditor（maxDecimalLength=2） | - | allowBlank=false | stopedit→rmb_amount 折算（=D13/=H13） |
| D14 | rmb_amount | 初始金额（折人民币） | NumberEditor（maxDecimalLength=2） | - | - | - |
| H14 | balance | 业务余额（折人民币） | NumberEditor | - | - | - |
| D15 | invest_rate | 投资利率（%） | NumberEditor（maxDecimalLength=2） | - | - | - |
| H15 | transfer_rate | 价值转移利率（%） | NumberEditor（maxDecimalLength=2） | - | - | - |
| D16 | guarantee_info | 担保情况 | TextEditor（Present 数据字典-担保情况） | - | - | add/installment 是 ComboBox；look 改成 TextEditor |
| H16 | breach_flag | 是否逾欠/违约 | ComboBox | 数据字典-是否 | DirectEdit=false | - |
| D17 | five_level_class | 五级分类 | ComboBox | 数据字典-五级分类（key→key） | - | - |
| H17 | installment_flag | 是否涉及分期还款 | ComboBox | 数据字典-是否 | DirectEdit=false | - |
| D18 | （按钮）添加还款计划 | 还款计划 | FreeButton | - | - | click：installment_flag=="0"→alert；否则 `./install_ment.cpt&...&type=1`（**type=1**） |
| H18 | installment_detail | 还款计划明细 | TextArea disabled | - | - | 绑定 DS `repayment_info`（"查询当前业务的还款计划"） |
| I18 | installment | （隐藏） | TextArea disabled invisible | - | - | 绑定 DS `installment_list` |
| D19 | our_bank_underwrite | 是否我行承销 | ComboBox | 数据字典-是否 | - | - |
| H19 | agreed_usage | 约定资金用途 | TextEditor | - | allowBlank=false | - |
| D20 | manage_line | 所属管理条线 | ComboBox | 数据字典-所属管理条线（key→key） | - | - |
| H20 | dept | 对应处室 | ComboBox | 数据字典-对应初室（key→value） | - | - |
| D21 | fund_account_flag | 是否存在资金发放/募集账户账号 | ComboBox | 数据字典-是否 | DirectEdit=false | stopedit→显隐 fund_account |
| H21 | fund_account | 资金发放/募集账户账号 | TextEditor | - | EMSG"账号不允许为空" | stopedit→226014（AS00 校验） |
| D22 | supervise_account_flag | 是否存在资金监管/回款专户账号 | ComboBox | 数据字典-是否 | - | stopedit→显隐 supervise_account **并写 fund_used_flag** |
| H22 | supervise_account | 资金监管/回款专户账号 | TextEditor | - | EMSG"账号不允许为空" | stopedit→226014（AS00 校验） |
| D23 | fund_used_flag | 是否涉及我行资金监管 | ComboBox | 数据字典-是否 | - | 由 supervise_account_flag 联动 |
| H23 | fund_used_up | 我行监管资金是否已使用完毕 | ComboBox | 数据字典-是否 | - | - |
| D24 | drawdown_check | 支用检查情况 | TextEditor | - | **disabled=true** | - |
| D25 | remark_number | 批复号 | TextEditor | - | - | - |
| H25 | remark | 批复管理要求 | TextArea | - | - | - |
| D26 | js_remark_flag | 是否存在金融市场部批复管理要求 | ComboBox | 数据字典-是否 | - | stopedit→显隐 js_remark |
| H26 | js_remark | 金融市场部批复管理要求 | TextArea | - | look 页 EMSG"金融市场部批复管理要求不允许为空"（**busimanage 无此 EMSG**） | - |
| D27 | inspect_freq | 实地检查频率（月） | TextEditor | - | - | - |
| H27 | is_original_am | 是否原资产管理部回表业务 | ComboBox | 数据字典-是否 | - | - |
| D28 | exercise_flag | 是否行权 | ComboBox | 数据字典-是否行权特殊值 | DirectEdit=false | stopedit→行权日期联动 |
| H28 | exercise_date | 行权日期 | DateEditor | - | - | - |
| D29 | creator | 所属客户经理 | ComboBox | 无字典 | **disabled=true** | 绑定 DS creator |
| H29 | org_name | 所属机构 | ComboBox | 无字典 | **disabled=true** | 绑定 DS org_name |
| D30 | inspector_post | 投后检查实施人员岗位 | TextEditor | - | - | - |
| （F31） | （按钮）确定 | - | FreeButton (icon submitall) | - | - | callCloud 226007（§2.6.x 保存） |

### 2.5 JS 逻辑（look 共 12 个 JS 函数：afterload + 11 个控件/按钮）

- **afterload**：`myFR.init(); myFR.dialog.afterload();`（两页一致，无其他初始化逻辑）。
- **页面初始化参数**：主数据集（查询当前业务信息 / 查询当前业务的还款计划）均只依赖报表参数 `id`（URL 传入，数据集参数默认空）。报表参数仅 3 个：`prjId`(whjrscbmanage)、`cloudUrl`(= `"http://" + $cloud_service_ip`)、`updaterType`(默认空)。**未发现**按 bond_code/申报人初始化的 JS。
- **customer_no stopedit**：226010 ECIF 联动（与 §1.5.1 同文案）。busimanage 该 listener 额外声明了一个未使用参数 `ecif_customer_no`（公式 `=H2`，JS 体内不引用）。
- **int_rating stopedit**：同 §1.5.3（写 customer_type）。**无 afterinit**（载入不重算）。
- **is_passage stopedit**：
  ```js
  if(is_passage == "0"){
    passage_amount.setValue(""); passage_amount.setVisible(false);
    var rate_value = coupon_rate - vat - surcharge;      // coupon_rate/vat/surcharge=J7/J8/J9
    upper_storage_rate.setValue(parseFloat(rate_value.toFixed(6)));  // 显示6位小数
  } else { passage_amount.setVisible(true); }
  ```
- **passage_amount stopedit**：`upper_storage_rate = invest_rate - vat - surcharge - passage_amount`，同样 `toFixed(6)` 后 `parseFloat` 写回。**注：若通道费配置缺失（coupon_rate/vat/surcharge 为空），减出来是 NaN，toFixed(6) 会产生 "NaN" 字符串**（文件原文如此，无兜底）。
- **orig_amount stopedit**：同 §1.5.4，但 look 版只折算 `rmb_amount`（不写 balance）；参数 `=D13`(currency)/`=H13`(orig_amount)。
- **fund_account_flag stopedit**：同 §1.5.6。
- **fund_account / supervise_account stopedit**：226014，`if(data.status != "AS00")` 提示并 `reset()`（两页一致）。
- **supervise_account_flag stopedit**：
  ```js
  if(supervise_account_flag == "0"){
    supervise_account.setValue(""); supervise_account.setVisible(false);
    fund_used_flag.setValue("0");
  } else { supervise_account.setVisible(true); fund_used_flag.setValue("1"); }
  ```
  即由"是否存在资金监管/回款专户账号"反向驱动"是否涉及我行资金监管(fund_used_flag)"。
- **js_remark_flag stopedit**：`0→js_remark 清空并隐藏；否则显示`。
- **exercise_flag stopedit**：同 §1.5.7。
- **保存按钮（确定）callCloud 226007**（look 版）：
  ```js
  //前端校验
  myFR.callCloud("226007", { "businessId": id, "bondCode": v("bond_code"), ..., "upperStorageRate": v("upper_storage_rate"), "updaterType": "0" },
    function(data){ window.parent.FR.closeDialog(); window.parent.contentPane.parameterCommit(); window.parent.FR.Msg.toast("申请变更业务信息审批中"); }, null, true);
  ```
  发送字段（56 个）：`businessId, bondCode, ecifCustomerNo, customerNo, customerName, bizName, bondType, bizType, greenTechFlag, extRating, extRatingDate, ratingAgency, intRating, intRatingDate, industry, customerType, alertCustomer, startDate, matureDate, currency, origAmount, rmbAmount, balance, investRate, transferRate, guaranteeInfo, breachFlag, fiveLevelClass, fundUsedFlag, fundUsedUp, installmentFlag, installment, ourBankUnderwrite, manageLine, dept, agreedUsage, fundAccount, fundAccountFlag, superviseAccount, superviseAccountFlag, drawdownCheck, isOriginalAm, exerciseFlag, exerciseDate, remark, remarkNumber, jsRemark, jsRemarkFlag, inspectFreq, inspectorPost, leadUnderwriter, isPassage, passageAmount, upperStorageRate, updaterType`。
  `updaterType`：**look="0"，busimanage="1"**。定义在 click listener 参数里的 `updaterType=$updaterType` 只在 `console.log(updaterType)` 使用，载荷中是**写死的 0/1**。
  **"申请变更业务信息审批中"状态处理**：仅此 toast，未发现其他状态/审批态判断逻辑。

### 2.6 两页（look vs look_busimanage）完整差异对照表

| 差异点 | my_business_pc_look.cpt | my_business_pc_look_busimanage.cpt | 影响 |
|---|---|---|---|
| 保存载荷 `updaterType` | `"0"` | `"1"` | **唯一的行为级差异**：后端据此走"业务管理岗"工作流 |
| 保存 JS 注释 | 有 `//前端校验` | 无 | 注释 |
| js_remark EMSG | 有 `金融市场部批复管理要求不允许为空` | **无** | busimanage 对该框无非空提示 |
| exercise_flag stopedit | `_g().getWidgetByName("exercise_date").reset();` | `._g().getWidgetByName("exercise_date")..reset();`（**双点号，JS 语法错误**） | busimanage 在"否"分支会运行时抛错，行权日期不重置/不隐藏（真 bug） |
| customer_no (ECIF) listener 参数 | `<Parameters/>` 空 | 多一个未使用参数 `ecif_customer_no`（公式 `=H2`） | 无功能影响 |
| 数据字典-对应初室 位置 | 位于"查询当前通道费计算配置"之前 | 位于其后 | 顺序不同，内容相同 |
| 列宽（第 9 个数据列） | `3657600` | `9029700` | 布局差异 |
| 添加还款计划按钮单元格文本 `<O>`"添加还款计划" | 存在 | **缺失**（按钮内 FreeButton `<Text>` 仍显示"添加还款计划"） | 排版 |
| supervise_account_flag stopedit | setValue("") 后 setVisible(false) | setVisible(false) 后 setValue("") （含末尾多余空格） | 等效 |
| installment/passage 等 JS 内空白/对齐 | 若干行尾空格、缩进差异 | 同 | 等效 |
| is_passage、orig_amount 等 JS 计算正文 | 与右列相同 | 与左列相同 | 等效 |
| 数据集、字段、其余 JS、其余按钮、报表参数(prjId/cloudUrl/updaterType) | - | - | **完全一致** |

> 归纳：**没有** `busimanage` 参数、`fine_role` 判断或任何"管控岗"权限分支写在 cpt 里；`_busimanage` 只是同页复制版，唯一真正区别是保存时 `updaterType=1` 与上述两处小差异。

---

## 三、还款计划与通道费

### 3.1 还款计划展示（look 页）

- 数据来源：数据集 `查询当前业务的还款计划`，按 `bbb.id='${id}'` 关联 `bus_repayment_schedule`：
  - join 条件 `b.bond_code = bbb.bond_code COLLATE utf8mb4_general_ci AND b.status = '2'` —— **强调：look 用的是 `status='2'`，不是 status=1**。任务说明里"install_ment 是 status=2、look 是否 status=1"的推测不成立；两个页面（install_ment.cpt 专用数据集 ds1 也是 `b.status = 2`）口径一致，都是 **status=2** 的还款计划记录。
  - 两列输出：`repayment_info`（`还款时间:xxx,还款金额:xxx;` 用 `;` 拼接的 GROUP_CONCAT 文本）与 `installment_list`（`JSON_ARRAYAGG` 的 `[{installmentTime,installmentAmount}]`，installmentAmount 为 `CAST(... AS UNSIGNED)`）。
- 展示：`installment_detail`(H18, TextArea disabled) ← repayment_info；隐藏 `installment`(I18) ← installment_list，保存时 `v("installment")` 原样上传 226007。
- "添加还款计划"按钮：type=1 → install_ment 弹窗把新计划写回父页 H18/I18（即这两个 DS 单元格），弹窗关闭后明细即时更新。按钮逻辑与 add/installment 的唯一区别是 type=0→type=1。
- 保存字段：look 用 `"installment": v("installment")`（控件名与写入单元 I18 的控件名一致，正常）。

### 3.2 通道费计算配置（bus_upper_storage_config）

- 展示数据源：`查询当前通道费计算配置`（`select * from bus_upper_storage_config`，无参数）。页面用**隐藏的 J7/J8/J9** 三个 DS 单元格取第 1 行的 `coupon_rate`、`vat`、`surcharge`（文件原文：r6→J7 `coupon_rate`, r7→J8 `vat`, r8→J9 `surcharge`）。
- 页面可填项（均来自/回写 `bus_bond_business`）：
  - `is_passage`（是否有通道费，下拉 是否）
  - `passage_amount`（通道费金额(%)，NumberEditor 6 位小数，**可编辑**）
  - `upper_storage_rate`（上存利率(%)，NumberEditor 6 位小数，**可编辑**但通常由 JS 自动算）
- 计算规则（JS）：
  - 无通道费（is_passage=0）：`upper_storage_rate = coupon_rate - vat - surcharge`
  - 有通道费（用户填入 passage_amount）：`upper_storage_rate = invest_rate - vat - surcharge - passage_amount`
  - 均 `parseFloat(x.toFixed(6))`，即"显示6位小数"。
- 可编辑性：`is_passage`、`passage_amount`、`upper_storage_rate` 在 look 页均可编辑（变更申请场景）；`coupon_rate/vat/surcharge` 是只读配置（无控件）。

---

## 四、附注 / 未发现项汇总

1. **数据字典值的明文**：全部 EmbeddedTableData 的 RowData 为帆软内部序列化，无法从 cpt 读出 key/value 明文。
2. **"获取配置参数"数据集**：在 look/busimanage 中**未发现**；通道费配置即"查询当前通道费计算配置"。
3. **creator 过滤 / 角色权限判断（fine_role / busimanage 参数 / "管控岗"标注）**：look/busimanage 均**未发现**；`_busimanage` 差异仅 `updaterType` 等见 §2.6。
4. **installment 页保存的 `v("installment_plan")` 与 `v("drawdown_check")` 无对应控件**（installment_plan 无、drawdown_check 无）→ 上传恒空串（潜在 bug，add 的 drawdownCheck 同样恒空）。
5. **busimanage 的 exercise_flag "否"分支 `..reset()` 双点号**为 JS 语法错误（运行时抛错）。
6. **installment 页 `businessId=""` 恒新建**：即使打开时带 id 回填，保存仍走创建分支。
7. "机构列表 / 用户列表 / 数据字典-国标行业 / 数据字典-客户规模"被若干控件作为 **Present（显示）字典**引用，但不在本 cpt 的 TableDataMap 内（依赖帆软服务器侧同名数据集/内建字典）。
8. cloudUrl 模板参数：add 写死 `http://localhost:9058`，installment/look/busimanage 均为 `"http://" + $cloud_service_ip`。