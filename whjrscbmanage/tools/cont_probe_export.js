/* 文字探针：导出按钮（无截图）——抓 download 事件 / /api/data 响应 / 页面错误 */
const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
const P = 'busi_center/Finance_market_dept/whjrscbmange';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONS ' + m.text().slice(0, 180)); });
  page.on('response', async r => {
    if (r.url().indexOf('/api/data') !== -1 && r.request().method() === 'POST') {
      let body = '';
      try { const j = await r.json(); body = 'rows=' + (j.data ? j.data.length : '?') + ' err=' + j.err_code + ' ' + String(j.err_msg || '').slice(0, 80); } catch (e) { body = '(status ' + r.status() + ')'; }
      const pd = r.request().postData() || '';
      const m = pd.match(/datasource_name[^}]*"([a-z_]+)"/);
      console.log('  /api/data ' + (m ? m[1] : '?') + ' → ' + body);
    }
  });
  await login(page, BASE);
  await page.goto(BASE + '/decision/view/report?op=write&reportlet=' + P + '/pages/business_pool_view.cpt&t=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.locator('#app-root').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  console.log('点击导出...');
  const btn = page.locator('button').filter({ hasText: /导\s*出/ });
  console.log('导出按钮数=' + await btn.count());
  const dl = await Promise.all([
    btn.first().click().catch(function(e) { console.log('CLICK ERR ' + e.message.slice(0, 120)); }),
    page.waitForEvent('download', { timeout: 12000 }).catch(function() { return null; })
  ]);
  const download = dl[1];
  if (download) { console.log('download 触发: suggested=' + download.suggestedFilename()); }
  else console.log('download 未触发');
  await page.waitForTimeout(1200);
  const msgs = await page.locator('.ant-message').innerText().catch(() => '');
  if (msgs) console.log('消息: ' + msgs.slice(0, 200));
  errs.filter(e => !/qrcode|CryptoJS|BI is not defined/.test(e)).slice(0, 8).forEach(e => console.log('ERR ' + e));
  await browser.close();
})();