/* 文字探针：config 页保存流程（无截图）——抓 /api/data 请求与响应、页面错误、消息 */
const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONS ' + m.text().slice(0, 160)); });
  page.on('response', async r => {
    const u = r.url();
    if (u.indexOf('/api/data') !== -1) {
      let body = '';
      try { body = JSON.stringify(await r.json()); } catch (e) { body = '(non-json ' + r.status() + ')'; }
      console.log('  /api/data RESP ' + r.status() + ' ' + body.slice(0, 300));
    }
  });
  page.on('request', r => { if (r.url().indexOf('/api/data') !== -1 && r.method() === 'POST') console.log('  /api/data REQ ' + r.postData()); });
  await login(page, BASE);
  await page.goto(BASE + '/decision/view/report?op=write&reportlet=whjrscbmanage/pages/config.cpt&t=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.locator('#app-root').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.locator('#vat').fill('0.07'); await page.locator('#vat').press('Tab');
  await page.waitForTimeout(400);
  const btn = page.locator('button').filter({ hasText: /保\s*存/ });
  console.log('保存按钮数=' + await btn.count());
  await btn.first().click();
  await page.waitForTimeout(2500);
  const msgs = await page.locator('.ant-message-notice-content').allInnerTexts().catch(() => []);
  console.log('消息: ' + msgs.join(' | '));
  errs.filter(e => !/qrcode|CryptoJS|BI is not defined/.test(e)).slice(0, 6).forEach(e => console.log('ERR ' + e));
  await browser.close();
})();