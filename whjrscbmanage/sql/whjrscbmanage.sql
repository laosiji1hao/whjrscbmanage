create table bus_bond_business
(
    id                     bigint auto_increment comment '自增主键'
        primary key,
    bond_code              varchar(50)                            null comment '债券编号或内部编号 定时同步初值为空 后续业务流程填写',
    apply_no               varchar(60)                            null comment '申请表编号 用于债同步去重和关联',
    ecif_customer_no       varchar(20)                            null comment 'ECIF客户编号',
    customer_no            varchar(20)                            null comment '客户编号',
    customer_name          varchar(100)                           null comment '融资人名称（授信主体）',
    biz_name               varchar(255)                           null comment '项目 债券名称',
    bond_type              varchar(10)                            null comment '标债 非标 0 标债 1 非标',
    biz_type               varchar(10)                            null comment '业务品种 整数编码 0到12',
    green_tech_flag        varchar(10)                            null comment '绿色 科技 养老 不涉及 0 绿色 1 科技 2 养老 3 不涉及',
    ext_rating             varchar(20)                            null comment '外部信用评级（主体）',
    ext_rating_date        date                                   null comment '外部信用评级日期',
    rating_agency          varchar(100)                           null comment '评级机构',
    int_rating             varchar(20)                            null comment '内部评级',
    int_rating_date        date                                   null comment '内部评级日期',
    industry               varchar(10)                            null comment '行业分类 0 货币金融服务 1 资本市场服务 2 保险业 3 其他金融业',
    customer_type          varchar(10)                            null comment '客户分类 0 一类 1 二类 2 三类 3 四类',
    alert_customer         varchar(10)  default '0'               null comment '是否我行预警客户 0 否（默认） 1 是',
    start_date             date                                   null comment '发放日 购买日',
    mature_date            date                                   null comment '到期日',
    currency               varchar(10)  default '人民币'             null comment '币种',
    orig_amount            decimal(18, 2)                         null comment '初始金额（原币）',
    rmb_amount             decimal(18, 2)                         null comment '初始金额（折人民币）',
    balance                decimal(18, 2)                         null comment '业务余额（折人民币） 系统自动计算',
    invest_rate            decimal(12, 6)                         null comment '投资利率 单位',
    transfer_rate          decimal(12, 6)                         null comment '价值转移利率 单位',
    guarantee_info         varchar(255) default '信用'              null comment '担保情况',
    breach_flag            varchar(10)  default '0'               null comment '是否逾欠 违约 0 否（默认） 1 是',
    five_level_class       varchar(50)  default '正常一档'            null comment '五级分类 默认正常一档',
    fund_used_flag         varchar(10)                            null comment '是否涉及我行资金监管 0 否 1 是',
    fund_used_up           varchar(10)  default '0'               null comment '我行监管资金是否已使用完毕 0 否（默认） 1 是',
    installment_flag       varchar(10)                            null comment '是否涉及分期还款 0 否 1 是',
    installment_plan       text                                   null comment '格式化还款计划文本 如 XXX日还款XX元 旧字段 请使用 inst_plan_dates inst_plan_amounts',
    inst_plan_dates        varchar(4000)                          null comment '分期还款日期列表 逗号分隔 形如 2024 03 15 2024 06 15',
    inst_plan_amounts      varchar(8000)                          null comment '分期还款金额列表 逗号分隔 与 dates 一一对应 单位 元',
    our_bank_underwrite    varchar(10)                            null comment '是否我行承销 0 否 1 是',
    lead_underwriter       varchar(255)                           null comment '主承销商 联席主承销商',
    manage_line            varchar(50)  default '金融市场部'           null comment '所属管理条线',
    dept                   varchar(50)                            null comment '对应处室（利率室 同业室）',
    agreed_usage           varchar(255)                           null comment '约定资金用途',
    fund_account           varchar(50)                            null comment '资金发放 募集账户账号',
    fund_account_flag      varchar(10)                            null comment '是否有资金发放账户 0 否 1 是 由 fund_account 非空自动推导',
    supervise_account      varchar(50)                            null comment '资金监管 回款专户账号',
    supervise_account_flag varchar(10)                            null comment '是否有资金监管账户 0 否 1 是 由 supervise_account 非空自动推导',
    supervision_flag       varchar(10)                            null comment '是否涉及资金监管 0 否 1 是 同等于 supervise_account_flag',
    drawdown_check         varchar(500)                           null comment '支用检查情况',
    is_original_am         varchar(10)  default '0'               null comment '是否原资产管理部回表业务 0 否（默认） 1 是',
    exercise_flag          varchar(10)                            null comment '是否行权 0 否 1 是',
    exercise_date          date                                   null comment '行权日期 届时触发企微提醒',
    remark                 text                                   null comment '批复管理要求',
    js_remark              text                                   null comment '金融市场部批复管理要求',
    js_remark_flag         varchar(10)  default '0'               null comment '是否存在金融市场部批复管理要求 0 否 1 是 由 js_remark 非空自动推导',
    inspect_freq           varchar(20)  default '3'               null comment '实地检查频率 月度频率 可选项 1 3 6 默认3月',
    inspector_post         varchar(100) default '客户经理'            null comment '投后检查实施人员岗位 默认客户经理',
    creator                varchar(50)                            not null comment '创建人OA',
    org_code               varchar(50)                            null comment '创建人所在机构编码',
    org_name               varchar(100)                           null comment '创建人所在机构名称',
    status                 tinyint      default 0                 not null comment '业务状态 0 未完善 1 审核中 2 审核失败 3 生效中 4 已过期 5 已中止',
    termination_reason     varchar(500)                           null comment '中止原因 仅在 status 等于 5 时有意义',
    create_time            datetime     default CURRENT_TIMESTAMP not null comment '创建时间',
    update_time            datetime     default (now())           not null on update CURRENT_TIMESTAMP comment '更新时间',
    exercise_reminder_sent tinyint      default 0                 not null comment '行权提醒是否已发送 0 未发 1 已发',
    remark_number          varchar(60)                            null comment '批复号',
    is_passage             varchar(10)                            null comment '是否有通道费 0 否 1 是',
    passage_amount         decimal(18, 2)                         null comment '通道费金额 单位 元',
    upper_storage_rate     decimal(12, 6)                         null comment '上存利率 单位 自动计算（公式 coupon_rate 减 vat 减 surcharge 减 channel_fee_amount）',
    constraint uk_apply_no
        unique (apply_no),
    constraint uk_bond_code
        unique (bond_code)
)
    comment '债券业务台账主表';

create table bus_manager_change_history
(
    id            bigint auto_increment comment '主键 自增'
        primary key,
    business_id   bigint                             not null comment '关联 bus_bond_business id',
    old_handler   varchar(50)                        null comment '原经办人OA',
    old_org_code  varchar(50)                        null comment '原经办人所在机构编码',
    old_org_name  varchar(100)                       null comment '原经办人所在机构名称',
    new_handler   varchar(50)                        null comment '新经办人OA',
    new_org_code  varchar(50)                        null comment '新经办人所在机构编码',
    new_org_name  varchar(100)                       null comment '新经办人所在机构名称',
    change_reason varchar(255)                       null comment '变更原因（可选）',
    applicant_oa  varchar(50)                        not null comment '申请人OA（本轮操作发起方）',
    create_time   datetime default CURRENT_TIMESTAMP not null comment '创建时间'
)
    comment '客户经理变更历史记录表';

create index idx_business_id
    on bus_manager_change_history (business_id);

create table bus_repayment_schedule
(
    id               bigint auto_increment comment '主键'
        primary key,
    bond_code        varchar(50)                        not null comment '债券编号 关联 bus_bond_business bond_code',
    sort             int                                not null comment '期次序号 从 1 开始',
    repayment_date   date                               not null comment '还款时间',
    repayment_amount decimal(18, 2)                     not null comment '还款金额 单位 元',
    create_time      datetime default CURRENT_TIMESTAMP not null comment '创建时间',
    update_time      datetime default (now())           not null on update CURRENT_TIMESTAMP comment '更新时间',
    status           tinyint  default 1                 not null comment '状态 0 已失效 1 审批中 2 已生效'
)
    comment '还款计划明细表';

create table bus_upper_storage_config
(
    id          int auto_increment comment '主键'
        primary key,
    config_key  varchar(50)    not null comment '配置键 目前固定 GLOBAL',
    coupon_rate decimal(12, 6) null comment '票面利率 单位 （年化） 如 3 650000',
    vat         decimal(12, 6) null comment '增值税 单位 如 0 060000',
    surcharge   decimal(12, 6) null comment '附加税 单位 如 0 012000',
    updater     varchar(50)    null comment '最后修改人OA',
    update_time datetime       null comment '最后修改时间',
    constraint uk_config_key
        unique (config_key)
)
    comment '上存利率全局配置表';

create table iassist_flow_data
(
    id              bigint auto_increment comment '主键 自增'
        primary key,
    business_no     varchar(50)                        not null comment '关联业务主表的 bond_code',
    applicant_oa    varchar(50)                        not null comment '申请人OA 即本次提交的操作人',
    flow_code       varchar(20)                        not null comment '关联 iassist_flow_type flow_code 指明本次审批的类型',
    data            text                               not null comment '提交给 i助手的完整 JSON 原文 用于审计和重试',
    approval_status tinyint  default 0                 not null comment '审批状态 0 待审批 1 通过 2 驳回',
    result_comment  varchar(500)                       null comment '审批意见（通过 驳回理由）',
    create_time     datetime default CURRENT_TIMESTAMP not null comment '申请时间',
    update_time     datetime                           not null on update CURRENT_TIMESTAMP comment '更新时间'
)
    comment 'i助手审批记录数据表';

create index idx_applicant_oa
    on iassist_flow_data (applicant_oa);

create index idx_approval_status
    on iassist_flow_data (approval_status);

create index idx_business_no
    on iassist_flow_data (business_no);

create index idx_flow_code
    on iassist_flow_data (flow_code);

create table iassist_flow_type
(
    id        int auto_increment comment '自增主键'
        primary key,
    flow_code varchar(20) not null comment '流程编号',
    flow_desc varchar(50) null comment '流程说明',
    constraint uk_flow_code
        unique (flow_code)
)
    comment '审批流程类型表';

create table whfr_user
(
    id         int          null comment '自增id',
    user_id    varchar(255) not null comment '用户id',
    user_name  varchar(255) null comment '用户名称',
    user_pass  varchar(255) null comment '用户密码',
    user_phone varchar(11)  null comment '用户电话',
    email      varchar(255) null comment '邮件地址',
    branch_no  varchar(255) null comment '部门编号',
    status     varchar(10)  null comment '用户状态 00有效 01失效'
)
    comment 'whfr用户信息表';

create table whoa_branch_info
(
    id          int auto_increment comment '自增id'
        primary key,
    dept_id     varchar(12)  null comment '部门id',
    p_dept_id   varchar(12)  null comment '上级部门id',
    dept_name   varchar(255) null comment '部门名称',
    b_type      varchar(12)  null comment '01 一级分行 02 二级分行',
    dept_type   varchar(12)  null comment '部门类型 01 分行 02 部室 03 营销部 04 综合性支行 05 小型支行 06 小微支行 07 社区支行 09 其他',
    branch_no   varchar(255) not null comment '部门编号',
    p_branch_no varchar(255) null comment '父级部门编号',
    branch_name varchar(255) null comment '部门名称2',
    status      varchar(2)   null comment '状态 01 有效 02 无效',
    emp_org_id  varchar(32)  null comment '人力资源系统机构id'
)
    comment 'OA机构信息表';

