/* ===== 我的业务申报列表（原 business_list）===== */
function App() {
    var { Table, Button, Input, Select, Space, Modal } = antd;
    const [data, setData] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [custOpts, setCustOpts] = React.useState([]);
    const [custName, setCustName] = React.useState('');
    const [modal, setModal] = React.useState({ open: false, url: '', title: '', width: 1200 });

    function fetchList(customerName) {
        setLoading(true);
        callData('declare_list', [{ name: 'p_customer_name', type: 'String', value: customerName || '' }], function(rows) {
            setData(rows || []);
            setLoading(false);
        }, function() { setLoading(false); });
    }
    React.useEffect(function() {
        callData('declare_customer_opt', [], function(rows) {
            setCustOpts((rows || []).map(function(r) { return { value: r.customer_name, label: r.customer_name }; }));
        }, null);
        fetchList('');
    }, []);

    function openForm(id) {
        var q = '&mode=' + (id ? 'edit' : 'add') + '&id=' + encodeURIComponent(id || '0');
        setModal({
            open: true,
            url: PATH.apiBase + '/view/report?op=write&viewlet=' +
                 PATH.getTemplatePath('business_form.cpt') + q,
            title: id ? '编辑业务信息' : '新增业务信息',
            width: id ? 1200 : 1200
        });
    }

    function handleSearch() { fetchList(custName); }
    function handleReset() { setCustName(''); setTimeout(function() { fetchList(''); }, 0); }

    React.useEffect(function() {
        function handler(e) {
            var d = e.data;
            if (!d) return;
            if (d.type === 'fr_form_saved') {
                setModal({ open: false, url: '', title: '', width: 1200 });
                fetchList(custName);
            }
            if (d.type === 'fr_iframe_resize') {
                var f = document.getElementById('modalFrame');
                if (f) f.style.height = Math.max(300, Math.min(d.height + 20, 700)) + 'px';
            }
        }
        window.addEventListener('message', handler);
        return function() { window.removeEventListener('message', handler); };
    }, [custName]);

    var columns = [
        { title: '序号', key: '__idx', width: 60, render: function(_, __, i) { return i + 1; } },
        { title: '债券编号', dataIndex: 'bond_code', width: 130 },
        { title: '客户名称', dataIndex: 'customer_name', width: 200 },
        { title: '项目/债券名称', dataIndex: 'biz_name', width: 220, ellipsis: true },
        { title: '状态', dataIndex: 'status', width: 90, render: function(v) { return statusText(v); } },
        { title: '创建时间', dataIndex: 'create_time', width: 170, render: function(v) { return fmtDate(v); } },
        { title: '操作', key: '__act', width: 90, fixed: 'right', render: function(_, r) {
            return React.createElement(Button, { size: 'small', type: 'link', onClick: function() { openForm(r.id); } }, '编辑');
        } }
    ];

    return (
        <div style={{ padding: '16px', background: '#f5f5f5', minHeight: '100vh' }}>
            <div style={{ background: '#fff', padding: '16px 24px', borderRadius: '8px' }}>
                <h2 style={{ margin: '0 0 4px' }}>我的业务申报列表</h2>
                <div style={{ color: '#888', marginBottom: 16 }}>当前查询结果条数为：{data.length}</div>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <Space wrap>
                        <span>客户名称:</span>
                        <Select showSearch allowClear placeholder="全部"
                            style={{ minWidth: 220 }} value={custName || undefined}
                            onChange={function(v) { setCustName(v || ''); }} options={custOpts} optionFilterProp="label" />
                        <Button type="primary" icon={icon('/outlined/search.svg')} onClick={handleSearch}>查询</Button>
                        <Button icon={icon('/outlined/reload.svg')} onClick={handleReset}>重置</Button>
                    </Space>
                    <Button type="primary" icon={icon('/outlined/plus.svg')} onClick={function() { openForm(0); }}>新增业务</Button>
                </div>

                <Table rowKey="id" loading={loading} columns={columns} dataSource={data} size="middle"
                    scroll={{ x: 1000 }} pagination={{
                        pageSize: 20, showSizeChanger: true, showTotal: function(t) { return '共 ' + t + ' 条'; }
                    }} />

                {modal.open && (
                    <Modal title={modal.title} open={true} footer={null} width={modal.width}
                        destroyOnClose
                        onCancel={function() { setModal({ open: false, url: '', title: '', width: 1200 }); }}
                        styles={{ body: { padding: 0 } }}>
                        <iframe id="modalFrame" src={modal.url}
                            style={{ width: '100%', height: '560px', minHeight: '300px', maxHeight: '700px', border: 'none' }} />
                    </Modal>
                )}
            </div>
        </div>
    );
}