/** FR前端 → 真实后端 链路验证（无截图）：business_list → 新增业务(226006) → 真实后端落库。
 * 前置：真实后端跑 9059（iassist.enabled=false）、flow_gateway.py 占 9058、FR 8075。
 * 断言：经 /api/data 查 pool 或直接查库确认行 status=1。
 */
const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
const PAGE = BASE + '/decision/view/report?op=write&reportlet=busi_center/Finance_market_dept/whjrscbmange/pages/business_list.cpt&t=' + Date.now();
const BOND = 'RTE2E' + String(Date.now()).slice(-6);
let bad = 0;
const ok = m => console.log('    ✔ ' + m);
function fail(m) { bad++; console.log('    ✘ ' + m); }
const btn = (f, t) => f.locator('button').filter({ hasText: new RegExp(t.split('').join('\\s*')) });
async function pick(f, id, want) {
  await f.locator('.ant-select:has(#' + id + ')').click();
  const dd = f.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  await dd.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  const opts = dd.locator('.ant-select-item-option:visible');
  for (let i = 0; i < await opts.count(); i++) {
    const t = (await opts.nth(i).getAttribute('title')) || (await opts.nth(i).innerText()) || '';
    if (String(t).indexOf(want) !== -1) { await opts.nth(i).click(); return; }
  }
  await opts.first().click();
}
async function setDateP(f, id, v) { const b = f.locator('.ant-form-item:has(#' + id + ') input').first(); await b.click(); await b.fill(v); await b.press('Enter'); }
async function typeText(f, id, v) { await f.locator('#' + id).fill(String(v)); }
async function setNum(f, id, v) { await f.locator('#' + id).fill(String(v)); await f.locator('#' + id).press('Tab'); }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1900, height: 900 } });
  await login(page, BASE);

  // 【诊断】监听 flowservice 调用
  page.on('response', async (resp) => {
    const u = resp.url();
    if (u.indexOf('flowservice') !== -1) {
      let body = '';
      try { body = (await resp.text()).slice(0, 200); } catch (e) {}
      console.log('  [NET] ' + resp.status() + ' ' + u.replace('http://localhost:8075', '') + ' → ' + body.replace(/\s+/g, ' '));
    }
  });

  console.log('【FR新增业务 → 真实后端 226006】');
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' });
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
  if (String(ecif).indexOf('ECIF_C0001') !== -1) ok('ECIF回填：' + ecif); else fail('ECIF未回填：' + ecif);
  if (String(cname).length) ok('融资人名称回填：' + cname); else fail('融资人名称未回填');

  await typeText(form, 'bond_code', BOND);
  await typeText(form, 'biz_name', 'FR→真实后端链路测试');
  await pick(form, 'green_tech_flag', '绿色');
  await pick(form, 'ext_rating', 'AAA');
  await setDateP(form, 'ext_rating_date', '2026-09-01');
  await typeText(form, 'rating_agency', '标准普尔');
  await pick(form, 'int_rating', 'AA+');
  await setDateP(form, 'int_rating_date', '2026-09-02');
  await pick(form, 'industry', '资本市场服务');
  await setDateP(form, 'start_date', '2026-09-03');
  await setDateP(form, 'mature_date', '2027-09-03');
  await pick(form, 'currency', '人民币');
  await setNum(form, 'orig_amount', '2000000');
  await page.waitForTimeout(500);
  await pick(form, 'installment_flag', '是');
  await typeText(form, 'agreed_usage', '流动资金贷款');
  await typeText(form, 'remark_number', 'R-E2E');
  await typeText(form, 'lead_underwriter', '中金公司');
  await setNum(form, 'invest_rate', '4.00');
  await setNum(form, 'transfer_rate', '1.50');
  await typeText(form, 'remark', '链路测试批复要求');
  // 添加一条还款计划（installment=是 时计划必填）
  await form.locator('button:has-text("添加还款计划")').click();
  const plan = form.frameLocator('iframe#planFrame');
  await plan.locator('#app-root').waitFor({ timeout: 20000 });
  await plan.locator('button:has-text("新增行")').click();
  await page.waitForTimeout(400);
  const prow = plan.locator('.ant-table-tbody .ant-table-row').last();
  await prow.locator('.ant-picker input').first().fill('2027-03-01'); await prow.locator('.ant-picker input').first().press('Enter');
  await prow.locator('.ant-input-number-input').first().fill('1000000'); await prow.locator('.ant-input-number-input').first().blur();
  await page.waitForTimeout(400);
  await plan.locator('body').press('Escape');
  await plan.locator('button').filter({ hasText: /提\s*交/ }).click();
  await page.waitForTimeout(1200);
  await btn(form, '保存').click();
  let closed = false;
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(500);
    const c = await page.locator('iframe#modalFrame').count().catch(() => 0);
    if (c === 0) { closed = true; break; }
  }
  if (closed) ok('保存成功，弹窗关闭'); else {
    fail('保存后弹窗未关闭（可能校验失败）');
    // 【诊断】采集当前 antd message / modal 可见文本
    const texts = await page.evaluate(() => Array.from(document.querySelectorAll('.ant-message-notice-content, .ant-modal-title, .ant-modal-body')).map(e => e.innerText).filter(Boolean).slice(0, 6));
    console.log('  [DIAG] 可见提示: ' + JSON.stringify(texts));
  }

  // 落库断言：真实后端「新增」只发 i助手审批流（业务行待审批回同步才建）→ 断言 iassist_flow_data 有该流的待批记录
  const auditRows = await page.evaluate(async () => {
    const body = { report_path: '/busi_center/Finance_market_dept/whjrscbmange/data/whjrscbmanage_data.cpt',
      datasource_name: 'audit_all', page_number: -1, page_size: -1, parameters: [] };
    const r = await fetch('/webroot/decision/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return (await r.json()).data || [];
  });
  const hit = auditRows.filter(x => x.biz_uuid === BOND && String(x.flow_code).indexOf('flow') !== -1);

  if (hit.length) {
    ok('真实后端已写入审批流 business_no=' + hit[0].biz_uuid + ' flow=' + hit[0].flow_code + '（业务行待审批回同步创建）');
  } else {
    fail('真实后端未写审批流 rows=' + JSON.stringify(auditRows));
  }

  await browser.close();
  console.log('\nFR→真实后端 链路结果 fail=' + bad);
  process.exit(bad ? 1 : 0);
})();