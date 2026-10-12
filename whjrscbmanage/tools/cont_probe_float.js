/* 文字探针：定位「小页面里 sentinel-ant-float-btn 浮球」的来源（无截图）
 * 打开 pool_view → 点「编辑」开 business_look 弹窗 → 全 frame 扫描 float-btn 元素
 */
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
  await page.waitForTimeout(1500);

  async function scanFrames(tag) {
    console.log('== ' + tag + ' ==');
    for (const f of page.frames()) {
      const url = f.url();
      if (url.indexOf('/decision/') === -1) continue;
      const found = await f.evaluate(() => {
        const els = [].slice.call(document.querySelectorAll('[class*="float-btn"], [class*="float-btn-body"], [class*="FloatButton"]'));
        const ver = (window.antd && window.antd.version) ? window.antd.version : (window.AntdVersion || '?');
        return { count: els.length, ver: ver, html: els.length ? els[0].outerHTML.slice(0, 300) : '', n: els.length ? els[0].parentElement && els[0].parentElement.outerHTML.slice(0, 200) : '' };
      }).catch(function() { return { count: -1 }; });
      if (found && found.count !== 0) {
        console.log('  FRAME ' + url.slice(0, 120));
        console.log('  antd.version=' + found.ver + ' float-btn count=' + found.count);
        console.log('  el html[:300]=' + String(found.html).slice(0, 300));
        console.log('  parent html[:200]=' + String(found.n).slice(0, 200));
      }
    }
  }

  await scanFrames('打开主页面后（未开弹窗）');

  // 点编辑 → 打开 business_look 弹窗
  await page.locator('.ant-table-row').first().locator('button:has-text("编辑")').first().click().catch(function() {
    console.log('  (无编辑按钮，改点第一行可用按钮前的池)');
  });
  await page.locator('iframe#poolFrame').waitFor({ timeout: 15000 });
  await page.waitForTimeout(3000);
  await scanFrames('打开小页面(business_look)弹窗后');

  await browser.close();
})();