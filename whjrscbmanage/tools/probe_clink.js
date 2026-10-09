const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await login(page, BASE);
  await page.goto(BASE + '/decision/view/report?op=write&reportlet=whjrscbmanage/pages/business_form.cpt&mode=add&id=0', { waitUntil: 'domcontentloaded' });
  await page.locator('#app-root').waitFor({ timeout: 15000 });
  await page.waitForTimeout(1000);
  // 打开 int_rating 下拉并选 AAA+
  await page.locator('.ant-select:has(#int_rating)').click();
  await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) > div:visible').last().waitFor({ timeout: 8000 });
  const opts = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option:visible');
  console.log('options count', await opts.count());
  for (let i=0;i<Math.min(5, await opts.count());i++) {
    console.log('  opt' + i, 'title=' + (await opts.nth(i).getAttribute('title')) + ' text=' + (await opts.nth(i).innerText()));
  }
  await opts.filter({ hasText: 'AAA+' }).first().click();
  await page.waitForTimeout(900);
  const sel = await page.locator('.ant-form-item:has(#customer_type) .ant-select-selection-item').innerText().catch(() => '(无)');
  console.log('customer_type selection-item:', sel);
  const ct = await page.evaluate(() => { const e = document.querySelector('#customer_type'); return e ? e.getAttribute('aria-label') + '|' + e.closest('.ant-select').className : 'none'; });
  console.log('customer_type:', ct);
  await browser.close();
})();
