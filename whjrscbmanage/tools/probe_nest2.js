const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  await login(page, BASE);
  await page.goto(BASE + '/decision/view/report?op=write&reportlet=whjrscbmanage/pages/business_form.cpt&mode=add&id=0', { waitUntil: 'domcontentloaded' });
  await page.locator('#app-root').waitFor({ timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.locator('.ant-select:has(#installment_flag)').click();
  await page.waitForTimeout(600);
  await page.locator('.ant-select-item-option[title="是"]').first().click();
  await page.waitForTimeout(500);
  // bond_code 填一下以便弹窗 URL 用
  await page.locator('#bond_code').fill('PROBE001');
  await page.locator('button:has-text("添加还款计划")').click();
  await page.waitForTimeout(4500);
  console.log('frames:');
  page.frames().forEach(f => console.log('  ', f.url().slice(0, 140)));
  const pf = page.frames().find(f => f.url().indexOf('installment_ment') !== -1);
  if (pf) {
    const app = await pf.locator('#app-root').count().catch(() => -1);
    const bodyTxt = await pf.locator('body').innerText().catch(() => 'ERR');
    console.log('planFrame #app-root:', app, '| body:', bodyTxt.replace(/\n+/g,' ').slice(0, 160));
  } else console.log('NO installment frame found');
  await browser.close();
})();
