/* ===== 金市业务池（原 my_business_pc_view + view_manager + view_export）=====
 * URL 参数：mode = view（个人池，默认） / manager（管理岗全行）
 * 操作：完善业务信息(view) / 变更客户经理 / 编辑 / 创建分期(view) / 中止 / 配置上存利率(manager)
 * 导出：本页直接取全量生成 57 列 CSV（替代原 export 页）
 */
function App() {
    var { Table, Button, Input, Select, Space, Modal } = antd;
    var [mode, setMode] = React.useState(function() {
        try {
            var qm = new URLSearchParams(window.location.search).get('mode');
            if (qm === 'view' || qm === 'manager') return qm;
            // 菜单挂载只能选 cpt、不能带参数 → 不同角色挂不同物理 cpt，
            // gen_pages 会对 business_pool_view / business_pool_manager 注入固定 WINDOW_POOL_MODE
            if (typeof WINDOW_POOL_MODE !== 'undefined' && (WINDOW_POOL_MODE === 'view' || WINDOW_POOL_MODE === 'manager')) {
                return WINDOW_POOL_MODE;
            }
            return 'view';
        } catch (e) { return 'view'; }
    });
    const [data, setData] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [total, setTotal] = React.useState(0);
    const [current, setCurrent] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(20);
    const [custName, setCustName] = React.useState('');
    const [bizName, setBizName] = React.useState('');
    const [status, setStatus] = React.useState('');
    const [custOpts, setCustOpts] = React.useState([]);
    const [bizOpts, setBizOpts] = React.useState([]);
    const [auditMap, setAuditMap] = React.useState({});
    const [modal, setModal] = React.useState({ open: false, url: '', title: '', width: 1000 });

    var IS_MANAGER = mode === 'manager';

    function listParams(page, size) {
        var p = [
            { name: 'p_customer_name', type: 'String', value: custName },
            { name: 'p_biz_name', type: 'String', value: bizName },
            { name: 'p_pageno', type: 'String', value: String(page || 1) },
            { name: 'p_pagesize', type: 'String', value: String(size || pageSize) }
        ];
        if (!IS_MANAGER) {
            p.push({ name: 'p_status', type: 'String', value: status });
        }
        return p;
    }
    function countParams() {
        var p = [
            { name: 'p_customer_name', type: 'String', value: custName },
            { name: 'p_biz_name', type: 'String', value: bizName }
        ];
        if (!IS_MANAGER) p.push({ name: 'p_status', type: 'String', value: status });
        return p;
    }

    function fetchList(page, size) {
        setLoading(true);
        callData(IS_MANAGER ? 'pool_list_all' : 'pool_list_mine', listParams(page, size), function(rows) {
            setData(rows || []);
            setLoading(false);
        }, function() { setLoading(false); });
    }
    function fetchTotal() {
        callData(IS_MANAGER ? 'pool_total_all' : 'pool_total_mine', countParams(), function(rows) {
            if (rows && rows.length) setTotal(parseInt(rows[0].totalcnt, 10) || 0);
            else setTotal(0);
        }, null);
    }
    function reload(page, size) { fetchList(page, size); fetchTotal(); }

    React.useEffect(function() {
        callData('audit_all', [], function(rows) {
            var m = {};
            (rows || []).forEach(function(r) { m[r.bond_code] = r.approval_id; });
            setAuditMap(m);
        }, null);
        // 筛选下拉数据：融资人名称 / 项目债券名称（DISTINCT）
        callData('pool_filter_opt', [], function(rows) {
            var c = [], b = [], seenC = {}, seenB = {};
            (rows || []).forEach(function(r) {
                var cn = r.customer_name, bn = r.biz_name;
                if (bn && !seenB[bn]) { seenB[bn] = 1; b.push({ value: bn, label: bn }); }
                if (cn && !seenC[cn]) { seenC[cn] = 1; c.push({ value: cn, label: cn }); }
            });
            setCustOpts(c); setBizOpts(b);
        }, null);
        reload(1, pageSize);
    }, []);

    function gated(r) {
        if (auditMap[r.bond_code] !== undefined) { antd.message.warning('本业务正在经历审批流程，不可变更'); return true; }
        return false;
    }

    function openDialog(pageName, extra, title, width) {
        var q = '';
        if (extra) {
            Object.keys(extra).forEach(function(k) { q += '&' + k + '=' + encodeURIComponent(extra[k]); });
        }
        setModal({
            open: true,
            url: PATH.apiBase + '/view/report?op=write&viewlet=' +
                 PATH.getTemplatePath(pageName + '.cpt') + q,
            title: title,
            width: width
        });
    }

    function actComplete(r) { openDialog('business_form', { mode: 'edit', biz_uuid: r.biz_uuid }, '编辑业务信息', 1200); }
    function actInstallment(r) { openDialog('business_form', { mode: 'installment', biz_uuid: r.biz_uuid }, '创建分期业务', 1200); }
    function actChangeMgr(r) {
        if (gated(r)) return;
        if (String(r.status) !== '3') { antd.message.warning('只有生效中的业务才能变更'); return; }
        openDialog('manager_change', { biz_uuid: r.biz_uuid, updaterType: IS_MANAGER ? 1 : 0 }, '编辑业务所属客户经理', 600);
    }
    function actEdit(r) {
        if (gated(r)) return;
        if (String(r.status) !== '3') { antd.message.warning('只有生效中的业务才能编辑'); return; }
        openDialog('business_look', { biz_uuid: r.biz_uuid, updaterType: IS_MANAGER ? 1 : 0 }, '编辑业务信息', 1200);
    }
    function actStop(r) {
        if (gated(r)) return;
        if (String(r.status) === '4') { antd.message.warning('已过期的业务不允许中止'); return; }
        Modal.confirm({
            title: '提示', content: '确认中止业务?', okText: '确定', cancelText: '取消',
            onOk: function() {
                CLIENT.call('226009', { businessId: r.biz_uuid, bondCode: r.bond_code, terminator: CUR_USER, updaterType: IS_MANAGER ? '1' : '0' }, function() {
                    try { window.parent.FR.Msg.toast('中止业务流程审批中'); } catch (e) {}
                    reload(current, pageSize);
                }, null);
            }
        });
    }
    function actConfig() { openDialog('config', { id: 0 }, '配置计算参数', 700); }
    function actAdd() { openDialog('business_form', { mode: 'add', biz_uuid: '' }, '新增业务信息', 1200); }

    function handlePageChange(page, size) { setCurrent(page); setPageSize(size); reload(page, size); }
    function handleSearch() { setCurrent(1); reload(1, pageSize); }
    function handleReset() {
        setCustName(''); setBizName(''); setStatus(''); setCurrent(1);
        setTimeout(function() { reload(1, pageSize); }, 0);
    }

    React.useEffect(function() {
        function handler(e) {
            var d = e.data;
            if (!d) return;
            if (d.type === 'fr_form_saved') {
                setModal({ open: false, url: '', title: '', width: 1000 });
                reload(current, pageSize);
            }
            if (d.type === 'fr_iframe_resize') {
                var f = document.getElementById('poolFrame');
                if (f) f.style.height = Math.max(300, Math.min(d.height + 20, 700)) + 'px';
            }
        }
        window.addEventListener('message', handler);
        return function() { window.removeEventListener('message', handler); };
    }, [current, pageSize]);

    // ── 导出（57 列，取全量）────────────────────────────────────────────
    function expVal(r, k, dict) {
        var v = r[k];
        function ynNot(x) { return String(x) === '1' ? '是' : '不涉及'; }
        if (dict === 'ynNot') return ynNot(v);
        if (dict === 'yn') return ynText(v);
        if (dict === 'status') return statusText(v);
        if (DICTS[dict]) return dictText(DICTS[dict], v);
        return v === undefined || v === null ? '' : String(v);
    }
    function handleExport() {
        setLoading(true);
        callData(IS_MANAGER ? 'pool_list_all' : 'pool_list_mine', listParams(1, 100000), function(rows) {
            setLoading(false);
            if (!rows || !rows.length) { antd.message.warning('没有可导出的数据'); return; }
            var cols = [
                ['债券编号或内部编号', 'bond_code', null], ['ECIF客户编号', 'ecif_customer_no', null],
                ['客户编号', 'customer_no', null], ['融资人名称', 'customer_name', null],
                ['项目/债券名称', 'biz_name', null], ['标准/非标准', 'bond_type', 'bondType'],
                ['业务品种', 'biz_type', 'bizType'], ['是否绿色/科技/养老/不涉及', 'green_tech_flag', 'greenTech'],
                ['外部信用评级', 'ext_rating', null], ['外部信用评级日期', 'ext_rating_date', null],
                ['外部评级机构', 'rating_agency', null], ['内部评级', 'int_rating', null],
                ['内部评级日期', 'int_rating_date', null], ['行业分类', 'industry', 'industry'],
                ['客户分类', 'customer_type', 'customerType'], ['是否我行预警客户', 'alert_customer', 'ynNot'],
                ['发放日/购买日', 'start_date', null], ['到期日', 'mature_date', null],
                ['币种', 'currency', null], ['初始金额', 'orig_amount', null],
                ['初始金额(折人民币)', 'rmb_amount', null], ['业务余额(折人民币)', 'balance', null],
                ['投资利率(%)', 'invest_rate', null], ['价值转移利率(%)', 'transfer_rate', null],
                ['担保情况', 'guarantee_info', null], ['是否逾欠/违约', 'breach_flag', 'ynNot'],
                ['五级分类', 'five_level_class', 'fiveLevel'], ['是否涉及我行资金监管', 'fund_used_flag', 'ynNot'],
                ['我行监管资金是否已使用完毕', 'fund_used_up', 'ynNot'], ['是否涉及分期还款', 'installment_flag', 'ynNot'],
                ['还款计划', 'installment_plan', null], ['是否我行承销', 'our_bank_underwrite', 'yn'],
                ['主承销商/联席主承销商', 'lead_underwriter', null], ['所属管理条线', 'manage_line', null],
                ['对应处室', 'dept', 'dept'], ['约定资金用途', 'agreed_usage', null],
                ['是否有资金发放账户', 'fund_account_flag', 'ynNot'], ['资金发放/募集账户账号(我行)', 'fund_account', null],
                ['是否有资金监管账户', 'supervise_account_flag', 'ynNot'], ['资金监管/回款专户账号(我行)', 'supervise_account', null],
                ['是否原资产管理部回表业务', 'is_original_am', 'ynNot'], ['是否行权', 'exercise_flag', 'ynNot'],
                ['行权日期', 'exercise_date', null], ['支用检查情况', 'drawdown_check', null],
                ['批复号', 'remark_number', null], ['批复管理要求', 'remark', null],
                ['是否金融市场部批复管理要求', 'js_remark_flag', 'ynNot'], ['金融市场部批复管理要求', 'js_remark', null],
                ['实地检查频率(月)', 'inspect_freq', null], ['投后检查实施人员岗位', 'inspector_post', null],
                ['客户经理', 'related_name', null], ['业务发生机构', 'org_name', null],
                ['业务状态', 'status', 'status'], ['是否有通道费', 'is_passage', 'ynNot'],
                ['通道费金额(%)', 'passage_amount', null], ['上存利率(%)', 'upper_storage_rate', null]
            ];
            var headers = ['序号'].concat(cols.map(function(c) { return c[0]; }));
            var body = rows.map(function(r, i) {
                return [i + 1].concat(cols.map(function(c) { return expVal(r, c[1], c[2]); }));
            });
            downloadXlsx('金市业务_' + dayjs().format('YYYYMMDDHHmmss') + '.xlsx', headers, body);
        }, function() { setLoading(false); });
    }

    var actCols = [];
    if (!IS_MANAGER) {
        actCols.push({ key: 'a1', label: '完善业务信息', show: function(r) { return String(r.status) === '0'; }, fn: actComplete });
    }
    actCols.push({ key: 'a2', label: '变更客户经理', show: function() { return true; }, fn: actChangeMgr });
    actCols.push({ key: 'a3', label: '编辑', show: function() { return true; }, fn: actEdit });
    if (!IS_MANAGER) {
        actCols.push({ key: 'a4', label: '创建分期', show: function() { return true; }, fn: actInstallment });
    }
    actCols.push({ key: 'a5', label: '中止', show: function() { return true; }, fn: actStop });

    var columns = [
        { title: '序号', key: '__idx', width: 60, render: function(_, __, i) { return (current - 1) * pageSize + i + 1; } },
        { title: '债券编号或内部编号', dataIndex: 'bond_code', width: 130 },
        { title: 'ECIF客户编号', dataIndex: 'ecif_customer_no', width: 120 },
        { title: '客户编号', dataIndex: 'customer_no', width: 110 },
        { title: '融资人名称', dataIndex: 'customer_name', width: 180, ellipsis: true },
        { title: '项目/债券名称', dataIndex: 'biz_name', width: 200, ellipsis: true },
        { title: '标准/非标准', dataIndex: 'bond_type', width: 110, render: function(v) { return dictText(DICTS.bondType, v); } },
        { title: '状态', dataIndex: 'status', width: 90, render: function(v) { return statusText(v); } },
        { title: '所属客户经理', dataIndex: 'related_name', width: 140, render: function(v) { return v || ''; } },
        { title: '所属机构', dataIndex: 'dept_name', width: 140, render: function(v) { return v || ''; } },
        { title: '创建时间', dataIndex: 'create_time', width: 160, render: function(v) { return fmtDate(v); } },
        { title: '操作', key: '__act', width: IS_MANAGER ? 180 : 260, fixed: 'right',
          render: function(_, r) {
              var btns = [];
              actCols.forEach(function(a) {
                  if (!a.show(r)) return;
                  btns.push(React.createElement(Button, {
                      key: a.key, size: 'small', type: 'link',
                      onClick: function() { a.fn(r); }
                  }, a.label));
              });
              return React.createElement(Space, { size: 0 }, btns);
          } }
    ];

    return (
        <div style={{ padding: '16px', background: '#f5f5f5', minHeight: '100vh' }}>
            <div style={{ background: '#fff', padding: '16px 24px', borderRadius: '8px' }}>
                <div style={{ color: '#888', marginBottom: 16 }}>当前查询结果条数为：{total}</div>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <Space wrap>
                        <span>融资人名称:</span>
                        <Select showSearch allowClear placeholder="全部" style={{ width: 180 }} value={custName || undefined}
                            onChange={function(v) { setCustName(v || ''); }} options={custOpts} optionFilterProp="label" />
                        <span>项目/债券名称:</span>
                        <Select showSearch allowClear placeholder="全部" style={{ width: 180 }} value={bizName || undefined}
                            onChange={function(v) { setBizName(v || ''); }} options={bizOpts} optionFilterProp="label" />
                        {!IS_MANAGER && (
                            <React.Fragment>
                                <span>状态:</span>
                                <Select allowClear placeholder="全部" style={{ width: 120 }} value={status || undefined}
                                    onChange={function(v) { setStatus(v || ''); }} options={selOpts(DICTS.status)} />
                            </React.Fragment>
                        )}
                        <Button type="primary" icon={icon('/outlined/search.svg')} onClick={handleSearch}>查询</Button>
                        <Button icon={icon('/outlined/reload.svg')} onClick={handleReset}>重置</Button>
                        {!IS_MANAGER && (
                            <Button type="primary" icon={icon('/outlined/plus.svg')} onClick={actAdd}>新增业务</Button>
                        )}
                    </Space>
                    <Space>
                        <Button icon={icon('/outlined/export.svg')} onClick={handleExport}>导出</Button>
                        {IS_MANAGER && (
                            <Button icon={icon('/outlined/setting.svg')} onClick={actConfig}>配置上存利率计算参数</Button>
                        )}
                    </Space>
                </div>

                <Table rowKey="id" loading={loading} columns={columns} dataSource={data} size="middle"
                    scroll={{ x: 1900, y: 'calc(100vh - 320px)' }} pagination={{
                        current: current, pageSize: pageSize, total: total,
                        showSizeChanger: true, showQuickJumper: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        showTotal: function(t) { return '共 ' + t + ' 条'; },
                        onChange: handlePageChange
                    }} />

                {modal.open && (
                    <Modal title={modal.title} open={true} footer={null} width={modal.width} destroyOnClose
                        onCancel={function() { setModal({ open: false, url: '', title: '', width: 1000 }); }}
                        styles={{ body: { padding: 0 } }}>
                        <iframe id="poolFrame" src={modal.url}
                            style={{ width: '100%', height: '560px', minHeight: '300px', maxHeight: '700px', border: 'none' }} />
                    </Modal>
                )}
            </div>
        </div>
    );
}