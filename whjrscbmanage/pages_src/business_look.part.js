/* ===== 查看我的申报 / 变更申请（原 my_business_pc_look ± busimanage）=====
 * URL 参数：id=业务主键；updaterType=1 表示业务管理岗（保存 226007 携带）
 * 保存 226007 —— "申请变更业务信息审批中"
 */
function App() {
    var { Form, Input, InputNumber, Select, Button, Space, Row, Col, Spin, Modal, DatePicker, Tooltip } = antd;
    const [form] = Form.useForm();
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [recordId, setRecordId] = React.useState('0');
    const [updaterType, setUpdaterType] = React.useState('0');
    const [cfg, setCfg] = React.useState({ coupon_rate: 0, vat: 0, surcharge: 0 });
    const [instDetail, setInstDetail] = React.useState('');
    const [instJson, setInstJson] = React.useState('');
    const [showPassage, setShowPassage] = React.useState(false);
    const [showFund, setShowFund] = React.useState(false);
    const [showSuper, setShowSuper] = React.useState(false);
    const [showJs, setShowJs] = React.useState(false);
    const [showExDate, setShowExDate] = React.useState(false);
    const [showInstall, setShowInstall] = React.useState(false); // 分期=否时隐藏还款计划区
    const [planModal, setPlanModal] = React.useState({ open: false, url: '' });
    const loadingRef = React.useRef(false);
    var cfgRef = { coupon_rate: 0, vat: 0, surcharge: 0, ready: false };
    var needUpperInit = false; // 等 config 就绪后再算初始上存利率（避免加载竞态算出 0）
    function initUpperWhenReady() {
        if (cfgRef.ready && needUpperInit) {
            needUpperInit = false;
            form.setFieldsValue({ upper_storage_rate: six(num(cfgRef.coupon_rate) - num(cfgRef.vat) - num(cfgRef.surcharge)) });
        }
    }

    function outtext(v) { return v === undefined || v === null ? '' : String(v); }
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
    function six(n) {
        if (n === undefined || n === null || n === '' || isNaN(Number(n))) return null;
        return parseFloat(Number(n).toFixed(6));
    }
    // 币种折算（人民币×1 / 美元×6.8）；look 版只折算 rmb_amount，不写 balance
    function convertAmount(currency, amt) {
        if (amt === null || amt === undefined || amt === '') return null;
        var val = Number(amt);
        if (isNaN(val)) return null;
        if (String(currency) === '美元') return Number((val * 6.8).toFixed(2));
        return Number(val.toFixed(2));
    }

    React.useEffect(function() {
        var q = new URLSearchParams(window.location.search);
        var id = q.get('biz_uuid') || '';
        setRecordId(id);
        setUpdaterType(q.get('updaterType') || '0');
        loadingRef.current = true;
        callData('config_get', [], function(rows) {
            if (rows && rows.length) {
                var c = rows[0];
                cfgRef.coupon_rate = num(c.coupon_rate) || 0;
                cfgRef.vat = num(c.vat) || 0;
                cfgRef.surcharge = num(c.surcharge) || 0;
                cfgRef.ready = true;
                setCfg({ coupon_rate: cfgRef.coupon_rate, vat: cfgRef.vat, surcharge: cfgRef.surcharge });
                initUpperWhenReady();
            }
        }, null);
        if (id && id !== '0') {
            callData('get_business', [{ name: 'p_biz_uuid', type: 'String', value: id }], function(rows) {
                loadingRef.current = false;
                setLoading(false);
                if (!rows || !rows.length) { antd.message.error('记录不存在'); return; }
                var d = rows[0];
                form.setFieldsValue({
                    id: d.id, bond_type: d.bond_type, customer_no: d.customer_no,
                    ecif_customer_no: d.ecif_customer_no, customer_name: d.customer_name,
                    biz_name: d.biz_name, bond_code: d.bond_code, green_tech_flag: d.green_tech_flag,
                    ext_rating: d.ext_rating, ext_rating_date: pickDay(d.ext_rating_date),
                    rating_agency: d.rating_agency, int_rating: d.int_rating,
                    int_rating_date: pickDay(d.int_rating_date), lead_underwriter: d.lead_underwriter,
                    industry: d.industry, customer_type: d.customer_type, alert_customer: d.alert_customer,
                    biz_type: d.biz_type, start_date: pickDay(d.start_date), mature_date: pickDay(d.mature_date),
                    currency: d.currency, orig_amount: num(d.orig_amount), rmb_amount: num(d.rmb_amount),
                    balance: num(d.balance), invest_rate: num(d.invest_rate),
                    transfer_rate: num(d.transfer_rate), guarantee_info: d.guarantee_info,
                    breach_flag: d.breach_flag, five_level_class: d.five_level_class,
                    installment_flag: d.installment_flag, our_bank_underwrite: d.our_bank_underwrite,
                    agreed_usage: d.agreed_usage, manage_line: d.manage_line, dept: d.dept,
                    fund_account_flag: d.fund_account_flag, fund_account: d.fund_account,
                    supervise_account_flag: d.supervise_account_flag, supervise_account: d.supervise_account,
                    fund_used_flag: d.fund_used_flag, fund_used_up: d.fund_used_up,
                    drawdown_check: d.drawdown_check, remark_number: d.remark_number, remark: d.remark,
                    js_remark_flag: d.js_remark_flag, js_remark: d.js_remark,
                    inspect_freq: d.inspect_freq, is_original_am: d.is_original_am,
                    exercise_flag: d.exercise_flag, exercise_date: pickDay(d.exercise_date),
                    creator: d.creator, org_name: d.org_name, inspector_post: d.inspector_post,
                    is_passage: outtext(d.is_passage), passage_amount: num(d.passage_amount),
                    upper_storage_rate: num(d.upper_storage_rate)
                });
                setShowFund(String(d.fund_account_flag || '0') === '1');
                setShowSuper(String(d.supervise_account_flag || '0') === '1');
                setShowJs(String(d.js_remark_flag || '0') === '1');
                setShowExDate(String(d.exercise_flag || '0') === '1');
                setShowInstall(String(d.installment_flag || '0') === '1');
                setShowPassage(String(d.is_passage || '0') === '1');
                if (String(d.is_passage || '0') !== '1') {
                    needUpperInit = true;
                    initUpperWhenReady();
                }
                // 还款计划并入主表：从 installment_plan(JSON) 解析回显（不再查独立表）
                var pl = planFromStore(d.installment_plan);
                setInstJson(pl.json);
                setInstDetail(pl.detail);
            });
        } else {
            loadingRef.current = false;
            setLoading(false);
        }
        setTimeout(notifyHeight, 50);
    }, []);

    React.useEffect(function() { notifyHeight(); });

    // 还款计划（type=1）回传
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

    function recalcRate(isPassage, passage) {
        var rate = null;
        if (String(isPassage) !== '1') {
            rate = six(num(cfg.coupon_rate) - num(cfg.vat) - num(cfg.surcharge));
        } else {
            var ir = num(form.getFieldValue('invest_rate'));
            rate = six(ir - num(cfg.vat) - num(cfg.surcharge) - num(passage));
        }
        form.setFieldsValue({ upper_storage_rate: rate });
    }

    function openPlan() {
        var flag = form.getFieldValue('installment_flag');
        if (String(flag) !== '1') { antd.message.warning('分期还款请选择是！'); return; }
        var bc = outtext(form.getFieldValue('bond_code'));
        setPlanModal({
            open: true,
            url: PATH.apiBase + '/view/report?op=write&viewlet=' +
                 PATH.getTemplatePath('installment_ment.cpt') +
                 '&bond_code=' + encodeURIComponent(bc) + '&type=1' +
                 '&initial=' + encodeURIComponent(instJson)
        });
    }

    // ECIF 客户编号 → ECIF客户号＋融资人名称（226010，与 form 同逻辑）
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

    // 账号可用性校验（226014）
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

    function handleSubmit() {
        form.validateFields().then(function(values) {
            var ct = outtext(values.customer_type);
            var inspectFreq = (ct === '0' || ct === '1') ? 3 : 1;
            var body = {
                businessId: outtext(recordId),
                bondCode: outtext(values.bond_code),
                ecifCustomerNo: outtext(values.ecif_customer_no),
                customerNo: outtext(values.customer_no),
                customerName: outtext(values.customer_name),
                bizName: outtext(values.biz_name),
                bondType: outtext(values.bond_type),
                bizType: outtext(values.biz_type),
                greenTechFlag: outtext(values.green_tech_flag),
                extRating: outtext(values.ext_rating),
                extRatingDate: values.ext_rating_date ? dayjs(values.ext_rating_date).format('YYYY-MM-DD') : '',
                ratingAgency: outtext(values.rating_agency),
                intRating: outtext(values.int_rating),
                intRatingDate: values.int_rating_date ? dayjs(values.int_rating_date).format('YYYY-MM-DD') : '',
                industry: outtext(values.industry),
                customerType: ct,
                alertCustomer: outtext(values.alert_customer),
                startDate: values.start_date ? dayjs(values.start_date).format('YYYY-MM-DD') : '',
                matureDate: values.mature_date ? dayjs(values.mature_date).format('YYYY-MM-DD') : '',
                currency: outtext(values.currency),
                origAmount: values.orig_amount === null || values.orig_amount === undefined ? '' : String(values.orig_amount),
                rmbAmount: values.rmb_amount === null || values.rmb_amount === undefined ? '' : String(values.rmb_amount),
                balance: values.balance === null || values.balance === undefined ? '' : String(values.balance),
                investRate: values.invest_rate === null || values.invest_rate === undefined ? '' : String(values.invest_rate),
                transferRate: values.transfer_rate === null || values.transfer_rate === undefined ? '' : String(values.transfer_rate),
                guaranteeInfo: outtext(values.guarantee_info),
                breachFlag: outtext(values.breach_flag),
                fiveLevelClass: outtext(values.five_level_class),
                fundUsedFlag: outtext(values.fund_used_flag),
                fundUsedUp: outtext(values.fund_used_up),
                installmentFlag: outtext(values.installment_flag),
                installment: instJson || '',
                ourBankUnderwrite: outtext(values.our_bank_underwrite),
                manageLine: outtext(values.manage_line),
                dept: outtext(values.dept),
                agreedUsage: outtext(values.agreed_usage),
                fundAccount: outtext(values.fund_account),
                fundAccountFlag: outtext(values.fund_account_flag),
                superviseAccount: outtext(values.supervise_account),
                superviseAccountFlag: outtext(values.supervise_account_flag),
                drawdownCheck: outtext(values.drawdown_check),
                isOriginalAm: outtext(values.is_original_am),
                exerciseFlag: outtext(values.exercise_flag),
                exerciseDate: values.exercise_date ? dayjs(values.exercise_date).format('YYYY-MM-DD') : '',
                remark: outtext(values.remark),
                remarkNumber: outtext(values.remark_number),
                jsRemark: outtext(values.js_remark),
                jsRemarkFlag: outtext(values.js_remark_flag),
                inspectFreq: String(inspectFreq),
                inspectorPost: outtext(values.inspector_post),
                leadUnderwriter: outtext(values.lead_underwriter),
                isPassage: outtext(values.is_passage),
                passageAmount: values.passage_amount === null || values.passage_amount === undefined ? '' : String(values.passage_amount),
                upperStorageRate: values.upper_storage_rate === null || values.upper_storage_rate === undefined ? '' : String(values.upper_storage_rate),
                updaterType: updaterType
            };
            setSaving(true);
            CLIENT.call('226007', body, function() {
                setSaving(false);
                try {
                    window.parent.FR.closeDialog();
                    window.parent.contentPane && window.parent.contentPane.parameterCommit();
                    window.parent.FR.Msg.toast('申请变更业务信息审批中');
                } catch (e) {}
                setTimeout(closeSelf, 300);
            }, function() { setSaving(false); });
        }).catch(function() {});
    }

    var sel = function(opts, placeholder) {
        return { style: { width: '100%' }, placeholder: placeholder || '请选择', options: selOpts(opts) };
    };
    var readOnlySpanStyle = { display: 'inline-block', paddingTop: 5 };

    return (
        <div style={{ padding: '16px 24px', paddingBottom: 16 }}>
            <Spin spinning={loading}>
                <Form form={form} layout="vertical" autoComplete="off"
                    onValuesChange={function(changed) {
                        if (loadingRef.current) return;
                        if (changed.installment_flag !== undefined) {
                            setShowInstall(String(changed.installment_flag) === '1');
                            if (String(changed.installment_flag) !== '1') {
                                setInstDetail('');
                                setInstJson('');
                            }
                        }
                        if (changed.orig_amount !== undefined || changed.currency !== undefined) {
                            var amt2 = changed.orig_amount !== undefined ? changed.orig_amount : form.getFieldValue('orig_amount');
                            var cur2 = changed.currency !== undefined ? changed.currency : form.getFieldValue('currency');
                            form.setFieldsValue({ rmb_amount: convertAmount(cur2, amt2) });
                        }
                        if (changed.is_passage !== undefined) {
                            var pv = String(changed.is_passage);
                            setShowPassage(pv === '1');
                            if (pv !== '1') form.setFieldsValue({ passage_amount: null });
                            recalcRate(pv, pv === '1' ? form.getFieldValue('passage_amount') : null);
                        }
                        if (changed.passage_amount !== undefined || changed.invest_rate !== undefined) {
                            if (String(form.getFieldValue('is_passage')) === '1') recalcRate('1', changed.passage_amount !== undefined ? changed.passage_amount : form.getFieldValue('passage_amount'));
                        }
                        if (changed.int_rating !== undefined) {
                            var c1 = ['AAA+', 'AAA', 'AAA-'];
                            var c2 = ['AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+'];
                            var r = String(changed.int_rating);
                            if (c1.indexOf(r) !== -1) form.setFieldsValue({ customer_type: '0' });
                            else if (c2.indexOf(r) !== -1) form.setFieldsValue({ customer_type: '1' });
                        }
                        if (changed.fund_account_flag !== undefined) {
                            setShowFund(String(changed.fund_account_flag) === '1');
                        }
                        if (changed.supervise_account_flag !== undefined) {
                            var sv = String(changed.supervise_account_flag);
                            setShowSuper(sv === '1');
                            form.setFieldsValue({ fund_used_flag: (sv === '1' ? '1' : '0') });
                        }
                        if (changed.js_remark_flag !== undefined) setShowJs(String(changed.js_remark_flag) === '1');
                        if (changed.exercise_flag !== undefined) {
                            var ev = String(changed.exercise_flag);
                            setShowExDate(ev === '1');
                            if (ev === '1') form.setFieldsValue({ exercise_date: form.getFieldValue('mature_date') });
                            else form.setFieldsValue({ exercise_date: null });
                        }
                        setTimeout(notifyHeight, 50);
                    }}>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item label="标准/非标准业务" name="bond_type" rules={[{ required: true, message: '请选择' }]}><Select {...sel(DICTS.symbolStandard)} /></Form.Item></Col>
                        <Col span={12}><Form.Item label={<span>客户编号<Tooltip title="填写信贷系统客户编号，个人以P开头，企业以C开头"><span style={{ marginLeft: 4, color: '#faad14', cursor: 'help' }}>{icon('/outlined/exclamation-circle.svg')}</span></Tooltip></span>} name="customer_no" rules={[{ required: true, message: '请输入' }]}><Input placeholder="客户编号（失焦自动查ECIF）" onBlur={function(e) { ecifQuery(e.target.value); }} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="ECIF客户号" name="ecif_customer_no"><Input placeholder="填后 17 位，失焦自动补零" onBlur={function(e) { form.setFieldsValue({ ecif_customer_no: padEcif(e.target.value) }); }} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="融资人名称" name="customer_name" rules={[{ required: true, message: '请输入' }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item label="项目/债券名称" name="biz_name"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item label="债券编号" name="bond_code"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item label="是否绿色/科技/养老/不涉及" name="green_tech_flag" rules={[{ required: true, message: '请选择' }]}><Select {...sel(DICTS.greenTech)} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="外部信用评级" name="ext_rating" rules={[{ required: true, message: '请选择' }]}><Select {...sel(DICTS.rating.map(function(x) { return { v: x, t: x }; }))} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="外部信用评级日期" name="ext_rating_date" rules={[{ required: true, message: '请选择' }]}><DatePicker style={{ width: '100%' }} placeholder="请选择日期" /></Form.Item></Col>
                        <Col span={12}><Form.Item label="外部评级机构" name="rating_agency"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item label="内部评级" name="int_rating" rules={[{ required: true, message: '请选择' }]}><Select {...sel(DICTS.rating.map(function(x) { return { v: x, t: x }; }))} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="内部评级日期" name="int_rating_date" rules={[{ required: true, message: '请选择' }]}><DatePicker style={{ width: '100%' }} placeholder="请选择日期" /></Form.Item></Col>
                        <Col span={12}><Form.Item label="主承销商" name="lead_underwriter"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item label="是否有通道费" name="is_passage"><Select {...sel(DICTS.yn)} /></Form.Item></Col>
                        {showPassage && (
                            <Col span={12}><Form.Item label="通道费金额(%)" name="passage_amount"><InputNumber style={{ width: '100%' }} precision={6} /></Form.Item></Col>
                        )}
                        <Col span={12}><Form.Item label="上存利率(%)" name="upper_storage_rate" rules={[{ required: true, message: '请输入' }]}><InputNumber style={{ width: '100%' }} precision={6} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="行业分类" name="industry" rules={[{ required: true, message: '请选择' }]}><Select {...sel(DICTS.industry)} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="客户分类" name="customer_type"><Select {...sel(DICTS.customerType)} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="是否我行预警客户" name="alert_customer"><Select {...sel(DICTS.yn)} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="业务品种" name="biz_type"><Select {...sel(DICTS.bizType)} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="发放日" name="start_date" rules={[{ required: true, message: '请选择' }]}><DatePicker style={{ width: '100%' }} placeholder="请选择日期" /></Form.Item></Col>
                        <Col span={12}><Form.Item label="到期日" name="mature_date"><DatePicker style={{ width: '100%' }} placeholder="请选择日期" /></Form.Item></Col>
                        <Col span={12}><Form.Item label="币种" name="currency" rules={[{ required: true, message: '请选择' }]}><Select {...sel(DICTS.currency)} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="初始金额" name="orig_amount" rules={[{ required: true, message: '请输入' }]}><InputNumber style={{ width: '100%' }} precision={2} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="初始金额（折人民币）" name="rmb_amount"><InputNumber style={{ width: '100%' }} precision={2} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="业务余额（折人民币）" name="balance"><InputNumber style={{ width: '100%' }} precision={2} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="投资利率（%）" name="invest_rate"><InputNumber style={{ width: '100%' }} precision={2} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="价值转移利率（%）" name="transfer_rate"><InputNumber style={{ width: '100%' }} precision={2} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="担保情况" name="guarantee_info"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item label="是否逾欠/违约" name="breach_flag"><Select {...sel(DICTS.yn)} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="五级分类" name="five_level_class"><Select {...sel(DICTS.fiveLevel.map(function(x) { return { v: x, t: x }; }))} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="是否涉及分期还款" name="installment_flag"><Select {...sel(DICTS.yn)} /></Form.Item></Col>
                        {showInstall && (
                        <React.Fragment>
                        <Col span={12}><Form.Item label="还款计划"><Button icon={icon('/outlined/plus.svg')} onClick={openPlan}>添加还款计划</Button></Form.Item></Col>
                        <Col span={12}><Form.Item label="还款计划明细"><Input.TextArea disabled autoSize={{ minRows: 2, maxRows: 4 }} value={instDetail} /></Form.Item></Col>
                        </React.Fragment>
                        )}
                        <Col span={12}><Form.Item label="是否我行承销" name="our_bank_underwrite"><Select {...sel(DICTS.yn)} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="约定资金用途" name="agreed_usage" rules={[{ required: true, message: '请输入' }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item label="所属管理条线" name="manage_line"><Select {...sel(DICTS.manageLine)} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="对应处室" name="dept"><Select {...sel(DICTS.dept)} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="是否存在资金发放/募集账户账号" name="fund_account_flag"><Select {...sel(DICTS.yn)} /></Form.Item></Col>
                        {showFund && (
                            <Col span={12}><Form.Item label="资金发放/募集账户账号" name="fund_account" rules={[{ required: true, message: '账号不允许为空' }]}><Input placeholder="失焦校验账号可用性" onBlur={function(e) { checkAccount('fund_account', e.target.value); }} /></Form.Item></Col>
                        )}
                        <Col span={12}><Form.Item label="是否存在资金监管/回款专户账号" name="supervise_account_flag"><Select {...sel(DICTS.yn)} /></Form.Item></Col>
                        {showSuper && (
                            <Col span={12}><Form.Item label="资金监管/回款专户账号" name="supervise_account" rules={[{ required: true, message: '账号不允许为空' }]}><Input placeholder="失焦校验账号可用性" onBlur={function(e) { checkAccount('supervise_account', e.target.value); }} /></Form.Item></Col>
                        )}
                        <Col span={12}><Form.Item label="是否涉及我行资金监管" name="fund_used_flag"><Select {...sel(DICTS.yn)} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="我行监管资金是否已使用完毕" name="fund_used_up"><Select {...sel(DICTS.yn)} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="支用检查情况" name="drawdown_check"><Input disabled style={{ background: '#f5f5f5' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="批复号" name="remark_number"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item label="批复管理要求" name="remark"><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="是否存在金融市场部批复管理要求" name="js_remark_flag"><Select {...sel(DICTS.yn)} /></Form.Item></Col>
                        {showJs && (
                            <Col span={12}><Form.Item label="金融市场部批复管理要求" name="js_remark" rules={[{ required: true, message: '金融市场部批复管理要求不允许为空' }]}><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} /></Form.Item></Col>
                        )}
                        <Col span={12}><Form.Item label="实地检查频率（月）" name="inspect_freq"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item label="是否原资产管理部回表业务" name="is_original_am"><Select {...sel(DICTS.yn)} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="是否行权" name="exercise_flag"><Select {...sel(DICTS.exercise)} /></Form.Item></Col>
                        {showExDate && (
                            <Col span={12}><Form.Item label="行权日期" name="exercise_date"><DatePicker style={{ width: '100%' }} placeholder="请选择日期" /></Form.Item></Col>
                        )}
                        <Col span={12}><Form.Item label="所属客户经理" name="creator"><Input disabled style={{ background: '#f5f5f5' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="所属机构" name="org_name"><Input disabled style={{ background: '#f5f5f5' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="投后检查实施人员岗位" name="inspector_post"><Input /></Form.Item></Col>
                    </Row>
                    <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <Button onClick={closeSelf}>取消</Button>
                            <Button type="primary" loading={saving} onClick={handleSubmit}>确定</Button>
                        </div>
                    </Form.Item>
                </Form>
            </Spin>

            {planModal.open && (
                <Modal title="还款计划" open={true} footer={null} width={640} destroyOnClose
                    onCancel={function() { setPlanModal({ open: false, url: '' }); }}
                    styles={{ body: { padding: 0 } }}>
                    <iframe id="planFrame2" src={planModal.url}
                        style={{ width: '100%', height: '420px', border: 'none' }} />
                </Modal>
            )}
        </div>
    );
}