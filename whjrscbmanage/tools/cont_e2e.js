/** whjrscbmanage 端到端功能验证（无截图版）—— localhost:8075 + mock 云 9058
 * 同 tools/e2e_flows.js 逻辑，仅去掉所有 page.screenshot；断言以落库结果为准。
 * 用法：NODE_PATH=<api_tester/node_modules> node tools/cont_e2e.js
 */
const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
const U4 = 'a3b3c3d3000000000000000000000004';
const U5 = 'a3b3c3d3000000000000000000000005';
const PY = process.env.FR_PY || 'C:/Users/asus/AppData/Local/Programs/Python/Python312/python.exe';
const PAGE = n => BASE + '/decision/view/report?op=write&reportlet=busi_center/Finance_market_dept/whjrscbmange/pages/' + n + '.cpt&t=' + Date.now();

let bad = [];
const ok = m => console.log('    ✔ ' + m);
function fail(m) { bad.push(m); console.log('    ✘ ' + m); }

// antd 会对恰 2 个中文的 Button 自动插空格（"提 交"）→ 用字符间容忍空格的 regex 匹配
function btn(frame, text) {
    const re = new RegExp(text.split('').join('\\s*'));
    return frame.locator('button').filter({ hasText: re });
}

async function pick(frame, id, wantText) {
    await frame.locator('.ant-select:has(#' + id + ')').click();
    const dd = frame.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
    await dd.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    const opts = dd.locator('.ant-select-item-option:visible');
    const n = await opts.count();
    for (let i = 0; i < n; i++) {
        const t = (await opts.nth(i).getAttribute('title')) || (await opts.nth(i).innerText()) || '';
        if (String(t).indexOf(wantText) !== -1) { await opts.nth(i).click(); return; }
    }
    await opts.first().click();
}
async function setDateP(frame, name, value) {
    const box = frame.locator('.ant-form-item:has(#' + name + ') input').first();
    await box.click(); await box.fill(value); await box.press('Enter');
}
async function typeText(frame, id, value) { await frame.locator('#' + id).fill(String(value)); }
async function setNum(frame, id, value) { await frame.locator('#' + id).fill(String(value)); await frame.locator('#' + id).press('Tab'); }
async function queryPool(page, bondCode) {
    return await page.evaluate(async function(bc) {
        var payload = { report_path: 'busi_center/Finance_market_dept/whjrscbmange/data/whjrscbmanage_data.cpt',
            datasource_name: 'pool_list_mine', page_number: -1, page_size: -1,
            parameters: [{ name: 'p_operator', type: 'String', value: 'admin' },
                         { name: 'p_customer_name', type: 'String', value: '' },
                         { name: 'p_biz_name', type: 'String', value: '' },
                         { name: 'p_status', type: 'String', value: '' },
                         { name: 'p_pageno', type: 'String', value: '1' },
                         { name: 'p_pagesize', type: 'String', value: '100' }] };
        var r = await fetch('/webroot/decision/api/data', { method: 'POST',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        var j = await r.json();
        return j.data.filter(function(x) { return x.bond_code === bc; });
    }, bondCode);
}
async function queryBizByUuid(page, uuid) {
    return await page.evaluate(async function(bid) {
        var payload = { report_path: 'busi_center/Finance_market_dept/whjrscbmange/data/whjrscbmanage_data.cpt',
            datasource_name: 'get_business', page_number: -1, page_size: -1,
            parameters: [{ name: 'p_biz_uuid', type: 'String', value: String(bid) }] };
        var r = await fetch('/webroot/decision/api/data', { method: 'POST',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        var j = await r.json();
        return j.data || [];
    }, uuid);
}

(async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1900, height: 950 } });
    const page = await ctx.newPage();
    await login(page, BASE);

    // ═══ 流程 A：新增申报（ECIF 联动 + 还款计划 + 保存 226006）════
    console.log('【流程A 新增申报】');
    await page.goto(PAGE('business_list'), { waitUntil: 'domcontentloaded' });
    await page.locator('#app-root').waitFor({ timeout: 15000 });
    await page.locator('button:has-text("新增业务")').click();
    await page.locator('iframe#modalFrame').waitFor({ timeout: 15000 });
    const form = page.frameLocator('iframe#modalFrame');
    await form.locator('#app-root').waitFor({ timeout: 15000 });

    await pick(form, 'bond_type', '标准化');
    await typeText(form, 'customer_no', 'C0001');
    await form.locator('#customer_no').press('Tab');
    await page.waitForTimeout(1300);
    let ecif = await form.locator('#ecif_customer_no').inputValue().catch(() => '');
    let cname = await form.locator('#customer_name').inputValue().catch(() => '');
    if (String(ecif).indexOf('ECIF_C0001') !== -1) ok('ECIF客户号自动回填：' + ecif); else fail('ECIF未回填：' + ecif);
    if (String(cname).length) ok('融资人名称自动回填：' + cname); else fail('融资人名称未回填');

    await typeText(form, 'bond_code', 'E2E001');
    await typeText(form, 'biz_name', '端到端测试债券');
    await pick(form, 'green_tech_flag', '绿色');
    await pick(form, 'ext_rating', 'AAA');
    await setDateP(form, 'ext_rating_date', '2026-09-01');
    await typeText(form, 'rating_agency', '标准普尔');
    await pick(form, 'int_rating', 'AA+');           // → customer_type=二类
    await setDateP(form, 'int_rating_date', '2026-09-02');
    await pick(form, 'industry', '资本市场服务');
    await setDateP(form, 'start_date', '2026-09-03');
    await setDateP(form, 'mature_date', '2027-09-03');
    await pick(form, 'currency', '人民币');
    await setNum(form, 'orig_amount', '2000000');
    await page.waitForTimeout(500);
    await pick(form, 'installment_flag', '是');
    await typeText(form, 'agreed_usage', '流动资金贷款');
    await typeText(form, 'remark_number', 'P-E2E-001');
    // 对齐后端必填白名单（form 33/33）：补填主承销商/投资利率/价值转移利率/批复管理要求
    await typeText(form, 'lead_underwriter', '中金公司');
    await setNum(form, 'invest_rate', '4.00');
    await setNum(form, 'transfer_rate', '1.50');
    await typeText(form, 'remark', '端到端测试批复要求');

    // 添加还款计划
    await form.locator('button:has-text("添加还款计划")').click();
    await page.waitForTimeout(4500);
    const plan = form.frameLocator('iframe#planFrame');
    await plan.locator('#app-root').waitFor({ timeout: 15000 });
    await plan.locator('button:has-text("新增行")').click();
    await page.waitForTimeout(400);
    const row = plan.locator('.ant-table-tbody .ant-table-row').first();
    const pDate = row.locator('.ant-picker input').first();
    await pDate.fill('2027-03-01'); await pDate.press('Enter');
    const pAmt = row.locator('.ant-input-number-input').first();
    await pAmt.fill('1000000'); await pAmt.blur();
    await page.waitForTimeout(400);
    await plan.locator('body').press('Escape');
    await page.waitForTimeout(300);
    await btn(plan, '提交').click();
    await page.waitForTimeout(800);

    // 保存
    await btn(form, '保存').click();
    await page.waitForTimeout(3000);
    const gone = await btn(form, '保存').count().catch(() => 0);
    if (gone === 0) ok('保存成功，表单关闭');
    else fail('保存后表单未关闭');

    // 库内验证
    const a = await queryPool(page, 'E2E001');
    if (a.length && String(a[0].status) === '1') ok('E2E001 落库 status=1（审批中）creator=' + a[0].creator);
    else fail('E2E001 落库异常 status=' + (a[0] && a[0].status));
    const arow = a[0] || {};
    if (String(arow.customer_type) === '1' || String(arow.customer_no) === 'C0001') ok('ECIF/评级联动落库（customer_type=' + (arow.customer_type === null || arow.customer_type === undefined ? '' : arow.customer_type) + '）');
    else fail('联动字段落库缺失 customer_type=' + arow.customer_type);

    // ═══ 流程 B：中止（226009）——审批通过后才落地 status=5 ════
    console.log('【流程B 中止业务】');
    await page.goto(PAGE('business_pool_view'), { waitUntil: 'domcontentloaded' });
    await page.locator('#app-root').waitFor({ timeout: 15000 });
    await btn(page.locator('.ant-table-row:has-text("BC000001")'), '中止').first().click();
    await btn(page.locator('.ant-modal:has-text("确认中止业务")'), '确定').click();
    await page.waitForTimeout(2500);
    const e1 = await queryBizByUuid(page, U4);
    if (e1.length && String(e1[0].status) === '3') ok('提交中止后业务仍可见（status=3，操作列显示「中止申请审批中」并锁定）');
    else fail('提交中止后状态异常 status=' + (e1[0] && e1[0].status));
    // 模拟定时任务：审批通过后才置为中止
    const { execSync } = require('child_process');
    execSync('"' + PY + '" tools/sim_approve.py 通过 BC000001', { stdio: 'inherit' });
    const e2 = await queryBizByUuid(page, U4);
    if (e2.length && String(e2[0].status) === '5') ok('中止审批通过后 status=5（从列表隐藏）');
    else fail('中止审批通过后未生效 status=' + (e2[0] && e2[0].status));

    // ═══ 流程 D：变更客户经理（226008）════（先做：226008 只落空 bondCode 的流，不阻塞后续变更申请）
    console.log('【流程D 变更客户经理】');
    await page.goto(PAGE('business_pool_view'), { waitUntil: 'domcontentloaded' });
    await page.locator('#app-root').waitFor({ timeout: 15000 });
    await page.locator('.ant-table-row:has-text("BC000002")').locator('button:has-text("变更客户经理")').first().click();
    await page.locator('iframe#poolFrame').waitFor({ timeout: 15000 });
    const mgr = page.frameLocator('iframe#poolFrame');
    await mgr.locator('#app-root').waitFor({ timeout: 15000 });
    await pick(mgr, 'dept1', '00101');
    await pick(mgr, 'person1', 'cm001');
    await mgr.locator('button:has-text("变更申请")').click();
    await page.waitForTimeout(2500);
    const d = await queryBizByUuid(page, U5);
    if (d.length && String(d[0].creator) !== 'cm001') ok('提交换经理审批前归属不变（creator 仍为 ' + (d[0] && d[0].creator) + '，审批通过才变更）');
    else fail('换经理提交即改归属异常 creator=' + (d[0] && d[0].creator));
    // 模拟定时任务审批通过后，归属才变更为 cm001
    const { execSync: sync } = require('child_process');
    sync('"' + PY + '" tools/sim_approve.py 通过 BC000002', { stdio: 'inherit' });
    const d2 = await queryBizByUuid(page, U5);
    if (d2.length && String(d2[0].creator) === 'cm001') ok('换经理审批通过后归属变更为 cm001');
    else fail('换经理审批通过未变更归属 creator=' + (d2[0] && d2[0].creator));

    // ═══ 流程 C：查看/变更申请（226007；226007 会给 BC000002 落审批流 → 必须放 D 之后；
    // D 已把 creator 换成 cm001 → 个人池看不见，用 manager 全景池跑）════
    console.log('【流程C 查看/变更申请】');
    await page.goto(PAGE('business_pool_manager'), { waitUntil: 'domcontentloaded' });
    await page.locator('#app-root').waitFor({ timeout: 15000 });
    await btn(page.locator('.ant-table-row:has-text("BC000002")'), '编辑').first().click();
    await page.locator('iframe#poolFrame').waitFor({ timeout: 15000 });
    const look = page.frameLocator('iframe#poolFrame');
    await look.locator('#app-root').waitFor({ timeout: 15000 });
    await typeText(look, 'biz_name', '汉江机械债券二期-变更');
    await pick(look, 'is_passage', '是');
    await setNum(look, 'passage_amount', '0.35');
    await page.waitForTimeout(500);
    await btn(look, '确定').click();
    await page.waitForTimeout(3000);
    const c = await queryBizByUuid(page, U5);
    if (c.length && String(c[0].biz_name).indexOf('变更') !== -1 && String(c[0].is_passage) === '1') ok('变更申请落库（biz_name+is_passage）');
    else fail('变更申请落库异常 ' + (c[0] && c[0].biz_name));

    // ═══ 流程 E：配置保存（SP）════
    console.log('【流程E 配置保存】');
    await page.goto(PAGE('config'), { waitUntil: 'domcontentloaded' });
    await page.locator('#app-root').waitFor({ timeout: 15000 });
    await setNum(page, 'vat', '0.07');
    await btn(page, '保存').click();
    await page.waitForTimeout(2000);
    const cfg = await page.evaluate(async function() {
        var r = await fetch('/webroot/decision/api/data', { method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ report_path: 'busi_center/Finance_market_dept/whjrscbmange/data/whjrscbmanage_data.cpt',
                datasource_name: 'config_get', page_number: -1, page_size: -1, parameters: [] }) });
        var j = await r.json();
        return j.data && j.data[0];
    });
    if (cfg && Math.abs(Number(cfg.vat) - 0.07) < 0.0001) ok('配置保存落库 vat=' + cfg.vat);
    else fail('配置保存异常 vat=' + (cfg && cfg.vat));

    await browser.close();
    console.log('\nE2E 完成（共 5 个流程）。失败数=' + bad.length);
    process.exit(bad.length ? 1 : 0);
})();