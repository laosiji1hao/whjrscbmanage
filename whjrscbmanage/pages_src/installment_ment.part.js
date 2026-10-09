/* ===== 还款计划弹窗（原 install_ment）=====
 * URL 参数：bond_code（当前债券编号）、type（0=申报表单写入；1=查看页写入，本组件只回传，处理在父页）
 * 提交：向父页面 postMessage {type:'fr_inst_plan', result, json, bond_code}，然后关闭
 */
function App() {
    var { Button, DatePicker, InputNumber, Table, Space, Popconfirm } = antd;
    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [bondCode, setBondCode] = React.useState('');

    React.useEffect(function() {
        var q = new URLSearchParams(window.location.search);
        var bc = q.get('bond_code') || '';
        setBondCode(bc);
        if (bc) {
            setLoading(true);
            callData('schedule_by_bond', [{ name: 'p_bond_code', type: 'String', value: bc }], function(data) {
                setLoading(false);
                setRows((data || []).map(function(r, i) {
                    return {
                        key: i + '_' + r.id,
                        sort: r.sort,
                        repayment_date: r.repayment_date ? dayjs(String(r.repayment_date).slice(0, 10)) : null,
                        repayment_amount: r.repayment_amount !== undefined && r.repayment_amount !== null ? Number(r.repayment_amount) : null
                    };
                }));
            }, function() { setLoading(false); });
        }
        setTimeout(notifyHeight, 50);
    }, []);

    function append() {
        setRows(function(prev) {
            var maxSort = prev.reduce(function(m, r) { return Math.max(m, Number(r.sort) || 0); }, 0);
            return prev.concat([{ key: 'new_' + prev.length + '_' + Date.now(), sort: maxSort + 1,
                                  repayment_date: null, repayment_amount: null }]);
        });
    }
    function remove(k) { setRows(function(prev) { return prev.filter(function(r) { return r.key !== k; }); }); }

    function submit() {
        var list = rows.filter(function(r) { return r.repayment_date && r.repayment_amount !== null && r.repayment_amount !== undefined && r.repayment_amount !== ''; })
                       .map(function(r) {
                           return {
                               installmentTime: dayjs(r.repayment_date).format('YYYY-MM-DD'),
                               installmentAmount: String(r.repayment_amount)
                           };
                       })
                       .sort(function(a, b) { return a.installmentTime < b.installmentTime ? -1 : 1; });
        if (!list.length) { antd.message.warning('请先填写还款计划明细（还款时间 + 还款金额）'); return; }
        var result = list.map(function(x) { return '还款时间:' + x.installmentTime + ',还款金额:' + x.installmentAmount; }).join(';');
        var json = JSON.stringify(list);
        try {
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'fr_inst_plan', result: result, json: json, bond_code: bondCode }, '*');
            }
        } catch (e) {}
        setTimeout(closeSelf, 200);
    }

    var columns = [
        { title: '还款时间', key: 'd', width: 220,
          render: function(_, r) {
              return React.createElement(DatePicker, {
                  value: r.repayment_date,
                  style: { width: '100%' },
                  onChange: function(v) {
                      setRows(function(prev) { return prev.map(function(x) { return x.key === r.key ? Object.assign({}, x, { repayment_date: v }) : x; }); });
                  }
              });
          } },
        { title: '还款金额', key: 'a', width: 220,
          render: function(_, r) {
              return React.createElement(InputNumber, {
                  value: r.repayment_amount,
                  style: { width: '100%' },
                  min: 0, precision: 2,
                  placeholder: '金额（元）',
                  onChange: function(v) {
                      setRows(function(prev) { return prev.map(function(x) { return x.key === r.key ? Object.assign({}, x, { repayment_amount: v }) : x; }); });
                  }
              });
          } },
        { title: '操作', key: 'op', width: 90,
          render: function(_, r) {
              return React.createElement(Popconfirm, { title: '确认删除该行？', onConfirm: function() { remove(r.key); } },
                  React.createElement(Button, { size: 'small', type: 'link', danger: true }, '删除'));
          } }
    ];

    return (
        <div style={{ padding: '16px 20px', paddingBottom: 20, maxWidth: 640 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>还款计划<span style={{ fontWeight: 'normal', fontSize: 12, color: '#888', marginLeft: 8 }}>债券编号：{bondCode || '（新增申报未生成）'}</span></h3>
            <Table rowKey="key" loading={loading} columns={columns} dataSource={rows} size="small"
                pagination={false} bordered scroll={{ x: 560 }}
                locale={{ emptyText: '暂无还款计划，请点击「新增行」录入' }} />
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button size="small" onClick={append}>新增行</Button>
                <Space>
                    <Button onClick={closeSelf}>关闭</Button>
                    <Button type="primary" onClick={submit}>提交</Button>
                </Space>
            </div>
        </div>
    );
}