/* ===== 业务申报/分期表单（原 my_business_pc_add + my_business_pc_installment）=====
 * URL 参数：mode = add(新增) / edit(编辑) / installment(创建分期，businessId 恒空)
 *          id = 业务主键（add 时可为 0）
 * 保存走云平台 226006；还款计划弹窗 type=0（回传 fr_inst_plan → installment 隐藏 JSON）
 */
function App() {
    var { Form, Input, InputNumber, Select, Button, Space, Row, Col, Spin, Modal, DatePicker, Tooltip } = antd;
    const [form] = Form.useForm();
    const [mode, setMode] = React.useState('add');
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [recordId, setRecordId] = React.useState('0');
    const [planModal, setPlanModal] = React.useState({ open: false, url: '' });
    const [instDetail, setInstDetail] = React.useState('');
    const [instJson, setInstJson] = React.useState('');
    const [showFund, setShowFund] = React.useState(false);
    const [showSuper, setShowSuper] = React.useState(false);
    const [showJs, setShowJs] = React.useState(false);
    const [showExDate, setShowExDate] = React.useState(false);
    const [showInstall, setShowInstall] = React.useState(false); // 分期=否时隐藏还款计划区

    var M_TITLE = { add: '新增业务信息', edit: '编辑业务信息', installment: '创建分期业务' };

    var loadingRef = React.useRef(false);

    // 初始化
    React.useEffect(function() {
        var q = new URLSearchParams(window.location.search);
        var m = q.get('mode') || 'add';
        var id = q.get('biz_uuid') || '';
        setMode(m);
        setRecordId(id);
        if (m === 'add') {
            form.setFieldsValue({ bond_type: '0', our_bank_underwrite: '0', currency: '人民币', guarantee_info: '信用',
                five_level_class: '正常一档', inspect_freq: '3', green_tech_flag: '0',
                installment_flag: '0', fund_account_flag: '0', supervise_account_flag: '0',
                js_remark_flag: '0', exercise_flag: '0' });
        } else if (id && id !== '0') {
            setLoading(true);
            loadingRef.current = true;
            callData('get_business', [{ name: 'p_biz_uuid', type: 'String', value: id }], function(rows) {
                setLoading(false);
                loadingRef.current = false;
                if (!rows || !rows.length) { antd.message.error('记录不存在'); return; }
                var d = rows[0];
                form.setFieldsValue({
                    biz_uuid: d.biz_uuid, bond_type: d.bond_type, customer_no: d.customer_no,
                    ecif_customer_no: d.ecif_customer_no, customer_name: d.customer_name,
                    biz_name: d.biz_name, bond_code: d.bond_code, green_tech_flag: d.green_tech_flag,
                    ext_rating: d.ext_rating, ext_rating_date: pickDay(d.ext_rating_date),
                    rating_agency: d.rating_agency, int_rating: d.int_rating,
                    int_rating_date: pickDay(d.int_rating_date), lead_underwriter: d.lead_underwriter,
                    industry: d.industry, customer_type: d.customer_type,
                    start_date: pickDay(d.start_date), mature_date: pickDay(d.mature_date),
                    currency: d.currency, orig_amount: num(d.orig_amount), rmb_amount: num(d.rmb_amount),
                    balance: num(d.balance), invest_rate: num(d.invest_rate),
                    transfer_rate: num(d.transfer_rate), guarantee_info: d.guarantee_info,
                    installment_flag: d.installment_flag, our_bank_underwrite: d.our_bank_underwrite,
                    agreed_usage: d.agreed_usage, fund_account_flag: d.fund_account_flag,
                    fund_account: d.fund_account, supervise_account_flag: d.supervise_account_flag,
                    supervise_account: d.supervise_account, remark_number: d.remark_number,
                    remark: d.remark, js_remark_flag: d.js_remark_flag, js_remark: d.js_remark,
                    exercise_flag: d.exercise_flag, exercise_date: pickDay(d.exercise_date)
                });
                setShowFund(String(d.fund_account_flag || '0') === '1');
                setShowSuper(String(d.supervise_account_flag || '0') === '1');
                setShowJs(String(d.js_remark_flag || '0') === '1');
                setShowExDate(String(d.exercise_flag || '0') === '1');
                setShowInstall(String(d.installment_flag || '0') === '1');
                // 完善业务信息（status=0 未完善草稿）：业务类型默认「非标准业务」(1)
                if (String(d.status) === '0' && !d.bond_type) form.setFieldsValue({ bond_type: '1' });
                // 还款计划并入主表：从 installment_plan(JSON) 解析回显（不再查独立表）
                var pl = planFromStore(d.installment_plan);
                setInstJson(pl.json);
                setInstDetail(pl.detail);
            }, function() { setLoading(false); });
        }
        setTimeout(notifyHeight, 50);
    }, []);

    function pickDay(v) {
        if (!v) return null;
        var d = dayjs(String(v).slice(0, 10));
        return d.isValid() ? d : null;
    }
    function num(v) {
        if (v === undefined || v === null || v === '') return null;
        var n = Number(v);
        return isNaN(n) ? null : n;
    }

    // iframe 高度持续上报（父页面弹窗自适应）
    React.useEffect(function() { notifyHeight(); });

    // 还款计划回传监听（installment_ment type=0 → 本页）
    React.useEffect(function() {
        function handler(e) {
            var d = e.data;
            if (!d) return;
            if (d.type === 'fr_inst_plan') {
                setPlanModal({ open: false, url: '' });
                setInstDetail(d.result || '');
                setInstJson(d.json || '[]');
            } else if (d.type === 'fr_form_saved') {
                setPlanModal({ open: false, url: '' }); // 还款计划弹窗点「关闭」关掉本弹窗
            }
        }
        window.addEventListener('message', handler);
        return function() { window.removeEventListener('message', handler); };
    }, []);

    // ── ECIF 客户编号 → ECIF客户号＋融资人名称（226010）──────────────────
    function outtext(v) { return v === undefined || v === null ? '' : String(v); }
    function ecifQuery(custNo) {
        if (!custNo) return;
        CLIENT.call('226010', { custNo: outtext(custNo) }, function(data) {
            var f = data || {};
            var curE = outtext(form.getFieldValue('ecif_customer_no'));
            var curN = outtext(form.getFieldValue('customer_name'));
            var ne = f.ecifCustomerNo === undefined || f.ecifCustomerNo === null ? '' : String(f.ecifCustomerNo);
            var nn = f.customerName === undefined || f.customerName === null ? '' : String(f.customerName);
            if (ne === '') {
                if (curE !== '') antd.message.warning('该客户编号查询的ECIF客户号不存在');
            } else if (curE !== '' && curE !== ne) {
                antd.Modal.confirm({ title: '提示',
                    content: 'ECIF客户号已在页面上填写为【' + curE + '】，与查询结果【' + ne + '】不一致，是否以此为准？',
                    okText: '确定', cancelText: '取消',
                    onOk: function() { form.setFieldsValue({ ecif_customer_no: ne }); } });
            } else {
                form.setFieldsValue({ ecif_customer_no: ne });
            }
            if (nn === '') {
                if (curN !== '') antd.message.warning('该客户编号查询的客户名称不存在');
            } else if (curN !== '' && curN !== nn) {
                antd.Modal.confirm({ title: '提示',
                    content: '客户名称已在页面上填写为【' + curN + '】，与查询结果【' + nn + '】不一致，是否以此为准？',
                    okText: '确定', cancelText: '取消',
                    onOk: function() { form.setFieldsValue({ customer_name: nn }); } });
            } else {
                form.setFieldsValue({ customer_name: nn });
            }
        }, null);
    }

    // ── 内部评级 → 客户分类（只读）─────────────────────────────────────
    function ratingToType(r) {
        var c1 = ['AAA+', 'AAA', 'AAA-'];
        var c2 = ['AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+'];
        if (c1.indexOf(String(r)) !== -1) return '0';
        if (c2.indexOf(String(r)) !== -1) return '1';
        return form.getFieldValue('customer_type');
    }

    // ── 币种折算（人民币×1 / 美元×6.8）────────────────────────────────
    function convertAmount(currency, amt) {
        if (amt === null || amt === undefined || amt === '') return null;
        var val = Number(amt);
        if (isNaN(val)) return null;
        if (String(currency) === '美元') return Number((val * 6.8).toFixed(2));
        return Number(val.toFixed(2));
    }

    // ── 账号可用性校验（226014）──────────────────────────────────────
    function checkAccount(name, acct) {
        if (!acct) return;
        CLIENT.call('226014', { acctNo: outtext(acct) }, function(data) {
            if (data && data.status !== 'AS00') {
                antd.message.warning('该账号不可用，查询结果为' + (data.statusTxt || data.status));
                form.setFieldsValue({ [name]: '' });
            }
        }, function() {
            form.setFieldsValue({ [name]: '' });
        });
    }

    // 添加还款计划
    function openPlan() {
        var flag = form.getFieldValue('installment_flag');
        if (String(flag) !== '1') { antd.message.warning('分期还款请选择是！'); return; }
        var bc = outtext(form.getFieldValue('bond_code'));
        setPlanModal({
            open: true,
            url: PATH.apiBase + '/view/report?op=write&viewlet=' +
                 PATH.getTemplatePath('installment_ment.cpt') +
                 '&bond_code=' + encodeURIComponent(bc) + '&type=0' +
                 '&initial=' + encodeURIComponent(instJson)
        });
    }

    // 保存（226006）
    function handleSubmit() {
        form.validateFields().then(function(values) {
            // 与后端联动校验一致（226006/226007）：分期标志=1 时计划不能为空
            if (outtext(values.installment_flag) === '1' && !instJson) {
                antd.message.error('分期还款计划不能为空');
                return;
            }
            var ct = outtext(values.customer_type);
            var inspectFreq = (ct === '0' || ct === '1') ? 3 : 1;
            var isNew = mode === 'installment' || mode === 'add';
            var businessId = isNew ? '' : outtext(recordId); // 新增/创建分期恒空；编辑按 biz_uuid

            var body = {
                businessId: businessId,
                bondCode: outtext(values.bond_code),
                ecifCustomerNo: outtext(values.ecif_customer_no),
                customerNo: outtext(values.customer_no),
                customerName: outtext(values.customer_name),
                bizName: outtext(values.biz_name),
                bondType: outtext(values.bond_type),
                greenTechFlag: outtext(values.green_tech_flag),
                extRating: outtext(values.ext_rating),
                extRatingDate: values.ext_rating_date ? dayjs(values.ext_rating_date).format('YYYY-MM-DD') : '',
                ratingAgency: outtext(values.rating_agency),
                intRating: outtext(values.int_rating),
                intRatingDate: values.int_rating_date ? dayjs(values.int_rating_date).format('YYYY-MM-DD') : '',
                industry: outtext(values.industry),
                customerType: ct,
                startDate: values.start_date ? dayjs(values.start_date).format('YYYY-MM-DD') : '',
                matureDate: values.mature_date ? dayjs(values.mature_date).format('YYYY-MM-DD') : '',
                currency: outtext(values.currency),
                origAmount: values.orig_amount === null || values.orig_amount === undefined ? '' : String(values.orig_amount),
                rmbAmount: values.rmb_amount === null || values.rmb_amount === undefined ? '' : String(values.rmb_amount),
                balance: values.balance === null || values.balance === undefined ? '' : String(values.balance),
                investRate: values.invest_rate === null || values.invest_rate === undefined ? '' : String(values.invest_rate),
                transferRate: values.transfer_rate === null || values.transfer_rate === undefined ? '' : String(values.transfer_rate),
                guaranteeInfo: outtext(values.guarantee_info),
                installmentFlag: outtext(values.installment_flag),
                installment: instJson || '',
                ourBankUnderwrite: outtext(values.our_bank_underwrite),
                agreedUsage: outtext(values.agreed_usage),
                fundAccount: outtext(values.fund_account),
                fundAccountFlag: outtext(values.fund_account_flag),
                superviseAccount: outtext(values.supervise_account),
                superviseAccountFlag: outtext(values.supervise_account_flag),
                drawdownCheck: '',
                exerciseFlag: outtext(values.exercise_flag),
                exerciseDate: values.exercise_date ? dayjs(values.exercise_date).format('YYYY-MM-DD') : '',
                remarkNumber: outtext(values.remark_number),
                remark: outtext(values.remark),
                jsRemark: outtext(values.js_remark),
                jsRemarkFlag: outtext(values.js_remark_flag),
                leadUnderwriter: outtext(values.lead_underwriter),
                inspectFreq: String(inspectFreq),
                inspectorPost: '客户经理'
            };
            setSaving(true);
            CLIENT.call('226006', body, function() {
                setSaving(false);
                try { window.parent.FR.Msg.toast(mode === 'installment' ? '创建分期业务信息审批中' : '新增业务业务信息审批中'); } catch (e) {}
                antd.message.success(mode === 'installment' ? '创建分期业务信息审批中' : '新增业务业务信息审批中', 2);
                setTimeout(function() { closeSelf(mode === 'installment' ? '创建分期业务信息审批中' : '新增业务业务信息审批中'); }, 300);
            }, function() { setSaving(false); antd.message.error('保存失败，请重试'); });
        }).catch(function() { antd.message.error('请完善必填项后再保存'); });
    }

    var sel = function(opts, placeholder) {
        return {
            style: { width: '100%' },
            placeholder: placeholder || '请选择',
            options: selOpts(opts)
        };
    };
    // 字段提示：黄色感叹号 + 悬浮说明（口径见 docs/字段联动规则.md）
    var hintTip = function(text) {
        return (
            <Tooltip title={text}>
                <span style={{ marginLeft: 4, color: '#faad14', cursor: 'help' }}>{icon('/outlined/exclamation-circle.svg')}</span>
            </Tooltip>
        );
    };

    return (
        <div style={{ padding: '16px 24px', paddingBottom: 16 }}>
            <Spin spinning={loading}>
                <Form form={form} layout="vertical" autoComplete="off"
                    onValuesChange={function(changed, all) {
                        if (loadingRef.current) return;
                        if (changed.installment_flag !== undefined) {
                            setShowInstall(String(changed.installment_flag) === '1');
                            if (String(changed.installment_flag) !== '1') {
                                setInstDetail('');
                                setInstJson('');
                            }
                        }
                        if (changed.int_rating !== undefined) {
                            var t = ratingToType(changed.int_rating);
                            if (t) form.setFieldsValue({ customer_type: t });
                        }
                        if (changed.orig_amount !== undefined || changed.currency !== undefined) {
                            var amt = changed.orig_amount !== undefined ? changed.orig_amount : all.orig_amount;
                            var cur = changed.currency !== undefined ? changed.currency : all.currency;
                            var rmb = convertAmount(cur, amt);
                            form.setFieldsValue({ rmb_amount: rmb, balance: rmb });
                        }
                        if (changed.fund_account_flag !== undefined) {
                            var fv = String(changed.fund_account_flag);
                            setShowFund(fv === '1');
                            if (fv !== '1') form.setFieldsValue({ fund_account: '' });
                        }
                        if (changed.supervise_account_flag !== undefined) {
                            var sv = String(changed.supervise_account_flag);
                            setShowSuper(sv === '1');
                            if (sv !== '1') form.setFieldsValue({ supervise_account: '' });
                        }
                        if (changed.js_remark_flag !== undefined) {
                            setShowJs(String(changed.js_remark_flag) === '1');
                        }
                        if (changed.exercise_flag !== undefined) {
                            var ev = String(changed.exercise_flag);
                            setShowExDate(ev === '1');
                            if (ev === '1') {
                                form.setFieldsValue({ exercise_date: form.getFieldValue('mature_date') });
                            } else {
                                form.setFieldsValue({ exercise_date: null });
                            }
                        }
                        setTimeout(notifyHeight, 50);
                    }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="标准/非标准业务" name="bond_type" rules={[{ required: true, message: '请选择' }]}>
                                <Select {...sel(DICTS.symbolStandard)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span>客户编号{hintTip('填写信贷系统客户编号，个人以P开头，企业以C开头。填写后，将自动获取ECIF客户号与客户名称')}</span>} name="customer_no" rules={[{ required: true, message: '请输入' }]}>
                                <Input placeholder="客户编号（失焦自动查ECIF）" onBlur={function(e) { ecifQuery(e.target.value); }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span>ECIF客户号{hintTip('请填写17位ecif系统的客户号，可填写后面的数字，系统将自动在前补零至17位')}</span>} name="ecif_customer_no" rules={[{ required: true, message: '请输入' }]}>
                                <Input placeholder="填后 17 位，失焦自动补零" onBlur={function(e) { form.setFieldsValue({ ecif_customer_no: padEcif(e.target.value) }); }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="融资人名称" name="customer_name" rules={[{ required: true, message: '请输入' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="项目/债券名称" name="biz_name" rules={[{ required: true, message: '请输入' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="债券编号" name="bond_code" rules={[{ required: true, message: '请输入' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="是否绿色/科技/养老/不涉及" name="green_tech_flag" rules={[{ required: true, message: '请选择' }]}>
                                <Select {...sel(DICTS.greenTech)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="外部信用评级" name="ext_rating" rules={[{ required: true, message: '请选择' }]}>
                                <Select {...sel(DICTS.rating.map(function(x) { return { v: x, t: x }; }))} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="外部信用评级日期" name="ext_rating_date" rules={[{ required: true, message: '请选择' }]}>
                                <DatePicker style={{ width: '100%' }} placeholder="请选择日期" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="外部评级机构" name="rating_agency" rules={[{ required: true, message: '请输入' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="内部评级" name="int_rating" rules={[{ required: true, message: '请选择' }]}>
                                <Select {...sel(DICTS.rating.map(function(x) { return { v: x, t: x }; }))} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="内部评级日期" name="int_rating_date" rules={[{ required: true, message: '请选择' }]}>
                                <DatePicker style={{ width: '100%' }} placeholder="请选择日期" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="主承销商" name="lead_underwriter" rules={[{ required: true, message: '请输入' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="行业分类" name="industry" rules={[{ required: true, message: '请选择' }]}>
                                <Select {...sel(DICTS.industry)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="客户分类" name="customer_type">
                                <Select {...sel(DICTS.customerType)} disabled />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="发放日" name="start_date" rules={[{ required: true, message: '请选择' }]}>
                                <DatePicker style={{ width: '100%' }} placeholder="请选择日期" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="到期日" name="mature_date" rules={[{ required: true, message: '请选择' }]}>
                                <DatePicker style={{ width: '100%' }} placeholder="请选择日期" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label={<span>币种{hintTip('支持人民币/美元，美元数额为人民币的6.8倍')}</span>} name="currency" rules={[{ required: true, message: '请选择' }]}>
                                <Select {...sel(DICTS.currency)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="初始金额" name="orig_amount" rules={[{ required: true, message: '请输入' }]}>
                                <InputNumber style={{ width: '100%' }} precision={2} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="初始金额（折人民币）" name="rmb_amount">
                                <InputNumber style={{ width: '100%' }} precision={2} disabled />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="业务余额（折人民币）" name="balance">
                                <InputNumber style={{ width: '100%' }} precision={2} disabled />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="投资利率（%）" name="invest_rate" rules={[{ required: true, message: '请输入' }]}>
                                <InputNumber style={{ width: '100%' }} precision={6} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="价值转移利率（%）" name="transfer_rate" rules={[{ required: true, message: '请输入' }]}>
                                <InputNumber style={{ width: '100%' }} precision={6} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="担保情况" name="guarantee_info" rules={[{ required: true, message: '请选择' }]}>
                                <Select {...sel(DICTS.guaranty)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="是否涉及分期还款" name="installment_flag" rules={[{ required: true, message: '请选择' }]}>
                                <Select {...sel(DICTS.yn)} />
                            </Form.Item>
                        </Col>
                        {showInstall && (
                            <React.Fragment>
                            <Col span={12}>
                                <Form.Item label="还款计划">
                                    <Button icon={icon('/outlined/plus.svg')} onClick={openPlan}>添加还款计划</Button>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="还款计划明细"><Input.TextArea disabled autoSize={{ minRows: 2, maxRows: 4 }} value={instDetail} /></Form.Item>
                            </Col>
                            </React.Fragment>
                        )}
                        <Col span={12}>
                            <Form.Item label="是否我行承销" name="our_bank_underwrite" rules={[{ required: true, message: '请选择' }]}>
                                <Select {...sel(DICTS.yn)} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="约定资金用途" name="agreed_usage" rules={[{ required: true, message: '请输入' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="是否存在资金发放/募集账户账号" name="fund_account_flag" rules={[{ required: true, message: '请选择' }]}>
                                <Select {...sel(DICTS.yn)} />
                            </Form.Item>
                        </Col>
                        {showFund && (
                            <Col span={12}>
                                <Form.Item label="资金发放/募集账户账号" name="fund_account" rules={[{ required: true, message: '账号不允许为空' }]}>
                                    <Input placeholder="失焦校验账号可用性" onBlur={function(e) { checkAccount('fund_account', e.target.value); }} />
                                </Form.Item>
                            </Col>
                        )}
                        <Col span={12}>
                            <Form.Item label="是否存在资金监管/回款专户账号" name="supervise_account_flag" rules={[{ required: true, message: '请选择' }]}>
                                <Select {...sel(DICTS.yn)} />
                            </Form.Item>
                        </Col>
                        {showSuper && (
                            <Col span={12}>
                                <Form.Item label="资金监管/回款专户账号" name="supervise_account" rules={[{ required: true, message: '账号不允许为空' }]}>
                                    <Input placeholder="失焦校验账号可用性" onBlur={function(e) { checkAccount('supervise_account', e.target.value); }} />
                                </Form.Item>
                            </Col>
                        )}
                        <Col span={12}>
                            <Form.Item label="批复号" name="remark_number" rules={[{ required: true, message: '请输入' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="批复管理要求" name="remark" rules={[{ required: true, message: '请输入' }]}>
                                <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="是否存在金融市场部批复管理要求" name="js_remark_flag" rules={[{ required: true, message: '请选择' }]}>
                                <Select {...sel(DICTS.yn)} />
                            </Form.Item>
                        </Col>
                        {showJs && (
                            <Col span={12}>
                                <Form.Item label="金融市场部批复管理要求" name="js_remark" rules={[{ required: true, message: '金融市场部批复管理要求不允许为空' }]}>
                                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="金融市场部批复管理要求不允许为空" />
                                </Form.Item>
                            </Col>
                        )}
                        <Col span={12}>
                            <Form.Item label="是否行权" name="exercise_flag" rules={[{ required: true, message: '请选择' }]}>
                                <Select {...sel(DICTS.exercise)} />
                            </Form.Item>
                        </Col>
                        {showExDate && (
                            <Col span={12}>
                                <Form.Item label="行权日期" name="exercise_date" rules={[{ required: true, message: '请选择' }]}>
                                    <DatePicker style={{ width: '100%' }} placeholder="请选择日期" />
                                </Form.Item>
                            </Col>
                        )}
                    </Row>
                    <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <Button onClick={closeSelf}>取消</Button>
                            <Button type="primary" loading={saving} onClick={handleSubmit}>保存</Button>
                        </div>
                    </Form.Item>
                </Form>
            </Spin>

            {planModal.open && (
                <Modal title="还款计划" open={true} footer={null} width={640} destroyOnClose
                    onCancel={function() { setPlanModal({ open: false, url: '' }); }}
                    styles={{ body: { padding: 0 } }}>
                    <iframe id="planFrame" src={planModal.url}
                        style={{ width: '100%', height: '720px', border: 'none' }} />
                </Modal>
            )}
        </div>
    );
}