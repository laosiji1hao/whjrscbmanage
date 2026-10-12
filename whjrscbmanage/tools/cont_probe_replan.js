/* 探针：还款计划「提交后再开弹窗应回显已填数据」（无截图）
 * business_form add 模式：选分期是→开弹窗→加行填 2027-03-01/1000000→提交→明细有数据→再次打开→应显示 1 行
 */
const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
const P = 'busi_center/Finance_market_dept/whjrscbmange';
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 140)));
  await login(page, BASE);
  await page.goto(BASE + '/decision/view/report?op=write&reportlet=' + P + '/pages/business_form.cpt&mode=add&id=0&t=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.locator('#app-root').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.locator('.ant-select:has(#installment_flag)').click();
  await page.waitForTimeout(400);
  await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option:visible').filter({ hasText: '是' }).first().click();
  await page.waitForTimeout(400);

  async function openPlan() {
    await page.locator('button:has-text("添加还款计划")').click();
    await page.locator('iframe#planFrame').waitFor({ timeout: 15000 });
    await page.waitForTimeout(2500);
    return page.frameLocator('iframe#planFrame');
  }
  async function addRowAndSubmit() {
    const plan = await openPlan();
    await plan.locator('button:has-text("新增行")').click();
    await page.waitForTimeout(400);
    const row = plan.locator('.ant-table-tbody .ant-table-row').first();
    await row.locator('.ant-picker input').first().fill('2027-03-01');
    await row.locator('.ant-picker input').first().press('Enter');
    await row.locator('.ant-input-number-input').first().fill('1000000');
    await page.waitForTimeout(300);
    await plan.locator('body').press('Escape');
    await page.waitForTimeout(200);
    await plan.locator('button').filter({ hasText: /提\s*交/ }).first().click();
    await page.waitForTimeout(1200);
    return plan;
  }
  await addRowAndSubmit();
  const detail = await page.locator('textarea').first().inputValue().catch(() => '');
  // 明细区是 textarea 之一；找含“还款时间”的 textarea
  const ta = page.locator('textarea').filter({ has: page.locator('xpath=.') }).first();
  const detailText = await page.evaluate(function() {
    var ts = Array.prototype.slice.call(document.querySelectorAll('textarea'));
    for (var i = 0; i < ts.length; i++) { if ((ts[i].value || '').indexOf('还款时间') !== -1) return ts[i].value; }
    return '';
  });
  console.log('第一次提交后明细: ' + (detailText || '(空)'));
  const ok1 = detailText.indexOf('还款时间:2027-03-01') !== -1 && detailText.indexOf('还款金额:1000000') !== -1;

  // 再次打开
  const plan2 = await openPlan();
  const rows2 = await plan2.locator('.ant-table-tbody .ant-table-row').count();
  const dVal = rows2 ? await plan2.locator('.ant-table-tbody .ant-table-row').first().locator('.ant-picker input').first().inputValue().catch(() => '') : '';
  const aVal = rows2 ? await plan2.locator('.ant-table-tbody .ant-table-row').first().locator('.ant-input-number-input').first().inputValue().catch(() => '') : '';
  const firstRowText = rows2 ? await plan2.locator('.ant-table-tbody .ant-table-row').first().innerText().catch(() => '') : '';
  console.log('再次打开后: 数据行=' + rows2 + ' 日期输入框=' + dVal + ' 金额输入框=' + aVal);
  const ok2 = rows2 >= 1 && String(dVal).indexOf('2027-03-01') !== -1 && aVal.indexOf('1000000') !== -1;
  console.log('判定: 明细有数据=' + ok1 + ' | 重开弹窗有数据=' + ok2);
  errs.filter(e => !/qrcode|CryptoJS|BI is not defined|plugin\.page\.table/.test(e)).slice(0, 4).forEach(e => console.log('ERR ' + e));
  await browser.close();
})();