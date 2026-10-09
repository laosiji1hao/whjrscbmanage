/* 文字版探针（无截图）：复现 business_form 内「添加还款计划」嵌套 iframe 当前状态
 * 用法：NODE_PATH=<api_tester/node_modules> node tools/cont_probe_plan.js
 */
const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONS ' + m.text().slice(0, 160)); });
  await login(page, BASE);

  await page.goto(BASE + '/decision/view/report?op=write&reportlet=whjrscbmanage/pages/business_list.cpt&t=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.locator('#app-root').waitFor({ timeout: 20000 });
  await page.locator('button:has-text("新增业务")').click();
  await page.locator('iframe#modalFrame').waitFor({ timeout: 20000 });
  console.log('modalFrame found');
  const form = page.frameLocator('iframe#modalFrame');
  await form.locator('#app-root').waitFor({ timeout: 20000 });
  console.log('form app-root OK');
  // 解锁：installment_flag=是（下拉在 form iframe 内，用 form 作用域）
  const allDd = form.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
  console.log('  visible dropdown 数=' + await allDd.count().catch(() => -1));
  await form.locator('.ant-select:has(#installment_flag)').click();
  await page.waitForTimeout(600);
  const dd = form.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  try { await dd.waitFor({ state: 'visible', timeout: 8000 }); console.log('  last dropdown visible'); } catch (e) { console.log('  (dropdown 未出现)'); }
  const n = await dd.locator('.ant-select-item-option:visible').count().catch(() => -1);
  console.log('  installment_flag 下拉选项数=' + n);
  console.log('  dd.innerText=' + JSON.stringify(await dd.innerText().catch(() => '')));
  console.log('  dd.html[:500]=' + String(await dd.innerHTML().catch(() => '')).slice(0, 500).replace(/\n/g, ' '));
  if (n > 0) {
    for (let i = 0; i < n; i++) {
      const opt = dd.locator('.ant-select-item-option:visible').nth(i);
      const txt = await opt.innerText().catch(() => '');
      if (String(txt).indexOf('是') !== -1) { await opt.click(); console.log('    clicked opt' + i); break; }
    }
  }
  await page.waitForTimeout(600);
  const flagVal = await form.locator('input#installment_flag').inputValue().catch(() => '(无)');
  console.log('installment_flag value=' + flagVal);
  await form.locator('button:has-text("添加还款计划")').click();
  await page.waitForTimeout(6000);

  console.log('== frames ==');
  page.frames().forEach(f => console.log('  FRAME ' + f.url().slice(0, 150)));

  // modalFrame 内是否有 planFrame iframe
  const planFrameInForm = await form.locator('iframe#planFrame').count().catch(() => -1);
  const planSrc = await form.locator('iframe#planFrame').getAttribute('src').catch(() => '(无)');
  console.log('in-form planFrame count=' + planFrameInForm + ' src=' + String(planSrc).slice(0, 180));

  const pf = page.frames().find(f => f.url().indexOf('installment_ment') !== -1);
  if (pf) {
    const app = await pf.locator('#app-root').count().catch(() => -1);
    const body = await pf.locator('body').innerText().catch(() => 'ERR');
    console.log('installment_ment frame #app-root=' + app + ' body[:120]=' + body.replace(/\n+/g, ' ').slice(0, 120));
  } else {
    console.log('NO installment_ment frame found');
  }

  const real = errs.filter(e => !/qrcode|CryptoJS|BI is not defined|401 Unauthorized|favicon/.test(e));
  console.log('== page errors (' + real.length + ') ==');
  real.slice(0, 8).forEach(e => console.log('  ' + e));
  await browser.close();
})();