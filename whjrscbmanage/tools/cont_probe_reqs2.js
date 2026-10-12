/* 复核探针2：pool_filter_opt 数据 + 新增业务弹窗（无截图） */
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
  await page.goto(BASE + '/decision/view/report?op=write&reportlet=' + P + '/pages/business_pool_view.cpt&t=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.locator('#app-root').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);

  const rows = await page.evaluate(async function() {
    var r = await fetch('/webroot/decision/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_path: 'busi_center/Finance_market_dept/whjrscbmange/data/whjrscbmanage_data.cpt',
        datasource_name: 'pool_filter_opt', page_number: -1, page_size: -1,
        parameters: [{ name: 'p_operator', type: 'String', value: 'admin' }, { name: 'user_name', type: 'String', value: 'admin' }] }) });
    var j = await r.json();
    return j.data || [];
  });
  console.log('pool_filter_opt rows=' + rows.length + ' 首行=' + JSON.stringify(rows[0] || {}));

  // 点“新增业务”
  await page.locator('#app-root').locator('button').filter({ hasText: /新\s*增/ }).first().click();
  await page.locator('iframe#poolFrame').waitFor({ timeout: 15000 });
  await page.waitForTimeout(3000);
  const ff = page.frames().find(f => f.url().indexOf('business_form') !== -1);
  console.log('业务弹窗 frame: ' + (ff ? 'yes' : 'NO') + ((ff ? '  app-root=' + await ff.locator('#app-root').count().catch(function(){ return -1; }) : '')));
  if (ff) {
    const app = await ff.locator('#app-root').innerText().catch(function() { return ''; });
    console.log('  弹窗内容[:60]=' + app.replace(/\n+/g, ' ').slice(0, 60));
  }
  await browser.close();
})();