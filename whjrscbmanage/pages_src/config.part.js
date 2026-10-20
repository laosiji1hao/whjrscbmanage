/* ===== 配置页：上存利率计算参数（原 calculate_config）===== */
function App() {
    var { Form, InputNumber, Button, Row, Col, Spin, Input } = antd;
    const [form] = Form.useForm();
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(function() {
        setLoading(true);
        callData('config_get', [], function(rows) {
            setLoading(false);
            if (rows && rows.length) {
                form.setFieldsValue({
                    id: rows[0].id,
                    coupon_rate: rows[0].coupon_rate,
                    vat: rows[0].vat,
                    surcharge: rows[0].surcharge
                });
            }
        }, function() { setLoading(false); });
        setTimeout(notifyHeight, 50);
    }, []);

    function handleSubmit() {
        form.validateFields().then(function(values) {
            // id 无对应 Form.Item（未注册），validateFields 不返回 → 从 store 直接取
            var id = form.getFieldValue('id');
            if (id === undefined || id === null || id === '') {
                antd.message.warning('配置记录不存在，无法保存');
                return;
            }
            setSaving(true);
            callData('upper_config_update', [
                { name: 'p_id', type: 'String', value: String(id) },
                { name: 'p_vat', type: 'String', value: values.vat === undefined || values.vat === null ? '' : String(values.vat) },
                { name: 'p_surcharge', type: 'String', value: values.surcharge === undefined || values.surcharge === null ? '' : String(values.surcharge) },
                { name: 'p_updater', type: 'String', value: CUR_USER }
            ], function(rows) {
                setSaving(false);
                if (spOk(rows)) { setTimeout(closeSelf, 300); }
            }, function() { setSaving(false); antd.message.error('保存失败，请重试'); });
        }).catch(function() {});
    }

    return (
        <div style={{ padding: '20px 24px', paddingBottom: 20 }}>
            <Spin spinning={loading}>
                <Form form={form} layout="vertical" autoComplete="off">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="增值税(%)" name="vat" rules={[{ required: true, message: '请输入增值税' }]}>
                                <InputNumber style={{ width: '100%' }} min={0} max={100} step={0.001} placeholder="如 0.06" suffix="%" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="附加税(%)" name="surcharge" rules={[{ required: true, message: '请输入附加税' }]}>
                                <InputNumber style={{ width: '100%' }} min={0} max={100} step={0.001} placeholder="如 0.012" suffix="%" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <Button onClick={closeSelf}>取消</Button>
                            <Button type="primary" loading={saving} onClick={handleSubmit}>保存</Button>
                        </div>
                    </Form.Item>
                </Form>
            </Spin>
        </div>
    );
}