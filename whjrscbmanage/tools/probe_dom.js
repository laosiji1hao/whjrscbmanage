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
  await page.waitForTimeout(1500);
  const ids = await page.evaluate(() => {
    const els = [];
    document.querySelectorAll('[id]').forEach(e => {
      const id = e.id;
      if (/^(customer_type|orig_amount|int_rating|currency|ext_rating_date|rating_agency)$/.test(id)) {
        els.push(id + ' : tag=' + e.tagName + ' cls=' + e.className.toString().slice(0, 40));
      }
    });
    return els;
  });
  ids.forEach(x => console.log(x));
  await browser.close();
})();
