/* 文字探针：确认小页面(弹窗 iframe)内 sentinel 浮球 display=none */
const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
const P = 'busi_center/Finance_market_dept/whjrscbmange';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  await login(page, BASE);
  await page.goto(BASE + '/decision/view/report?op=write&reportlet=' + P + '/pages/business_list.cpt&t=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.locator('#app-root').waitFor({ timeout: 20000 });
  await page.locator('button:has-text("新增业务")').click();
  await page.locator('iframe#modalFrame').waitFor({ timeout: 15000 });
  await page.waitForTimeout(2500);
  const mf = page.frame({ url: /business_form/ });
  if (!mf) { console.log('未找到 business_form frame'); await browser.close(); return; }
  const r = await mf.evaluate(() => {
    const need = document.querySelectorAll('style');
    let hasHide = false;
    for (let i = 0; i < need.length; i++) { if (/sentinel-ant-float-btn/.test(need[i].textContent || '')) hasHide = true; }
    const els = [].slice.call(document.querySelectorAll('[data-sentinel-button],[class*="sentinel-ant-float-btn"]'));
    const disp = els.length ? getComputedStyle(els[0]).display : '(无元素)';
    return { hasHide, count: els.length, disp };
  });
  console.log('小页面(business_form) 内 → ' + JSON.stringify(r));
  await browser.close();
})();