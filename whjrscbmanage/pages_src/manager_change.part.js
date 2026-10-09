/* ===== 编辑业务所属客户经理（原 my_business_pc_newmanager ± busimanage）=====
 * URL 参数：id=业务主键；updaterType=1 表示业务管理岗（保存 226008 带上），默认 0
 */
function App() {
    var { Form, Select, Button, Spin, Input } = antd;
    const [form] = Form.useForm();
    const [orgOpts, setOrgOpts] = React.useState([]);
    const [mgrOpts, setMgrOpts] = React.useState([]);
    const [saving, setSaving] = React.useState(false);
    const [businessId, setBusinessId] = React.useState('0');
    const [updaterType, setUpdaterType] = React.useState('0');

    React.useEffect(function() {
        var q = new URLSearchParams(window.location.search);
        setBusinessId(q.get('id') || '0');
        var ut = q.get('updaterType') || '0';
        setUpdaterType(ut);
        callData('org_options', [], function(rows) {
            setOrgOpts(rows.map(function(r) { return { value: r.dept_name, label: r.dept_name }; }));
        }, null);
        callData('manager_options', [], function(rows) {
            setMgrOpts(rows.map(function(r) { return { value: r.name_with_id, label: r.name_with_id }; }));
        }, null);
        setTimeout(notifyHeight, 50);
    }, []);

    function parseParen(v) {
        if (!v) return '';
        var m = String(v).match(/\(([^)]+)\)/);
        return m ? m[1].trim() : '';
    }
    function stripParen(v) {
        if (!v) return '';
        return String(v).replace(/\([^)]*\)/, '').trim();
    }

    function handleSubmit() {
        form.validateFields().then(function(values) {
            setSaving(true);
            CLIENT.call('226008', {
                businessId: String(businessId),
                creator: CUR_USER,
                newCreator: parseParen(values.person1),
                newOrgCode: parseParen(values.dept1),
                newOrgName: stripParen(values.dept1),
                updaterType: updaterType
            }, function() {
                setSaving(false);
                try { window.parent.FR.Msg.toast('申请更改客户经理审批中'); } catch (e) {}
                setTimeout(closeSelf, 300);
            }, function() { setSaving(false); });
        }).catch(function() {});
    }

    return (
        <div style={{ padding: '20px 24px', paddingBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>编辑业务所属客户经理</h3>
            <Form form={form} layout="vertical" autoComplete="off">
                <Form.Item label="归属机构" name="dept1" rules={[{ required: true, message: '请选择归属机构' }]}>
                    <Select placeholder="请选择归属机构" options={orgOpts} showSearch optionFilterProp="label" />
                </Form.Item>
                <Form.Item label="客户经理" name="person1" rules={[{ required: true, message: '请选择客户经理' }]}>
                    <Select placeholder="请选择客户经理" options={mgrOpts} showSearch optionFilterProp="label" />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <Button onClick={closeSelf}>取消</Button>
                        <Button type="primary" loading={saving} onClick={handleSubmit}>变更申请</Button>
                    </div>
                </Form.Item>
            </Form>
        </div>
    );
}