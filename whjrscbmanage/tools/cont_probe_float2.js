/* 文字探针：对照测 whjyx 页面是否有同样的 sentinel 浮球（无截图） */
const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  await login(page, BASE);
  const targets = [
    ['whjyx', '/decision/view/report?op=write&reportlet=whjyx/pages/verify_individual.cpt&t=' + Date.now()],
    ['whjrscbmange', '/decision/view/report?op=write&reportlet=busi_center/Finance_market_dept/whjrscbmange/pages/business_pool_view.cpt&t=' + Date.now()]
  ];
  for (const [tag, u] of targets) {
    await page.goto(BASE + u, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    const info = await page.evaluate(() => {
      const els = [].slice.call(document.querySelectorAll('[class*="float-btn"]'));
      const ver = window.antd && window.antd.version ? window.antd.version : '?';
      const r = { appRoot: !!document.getElementById('app-root'), btnCount: els.length, ver: ver,
                  btnId: els.length ? els[0].id : '', ready: document.readyState };
      const el = els[0];
      if (el) {
        const cs = getComputedStyle(el);
        r.style = 'pos=' + cs.position + ' disp=' + cs.display + ' L=' + cs.zIndex;
      }
      return r;
    }).catch(e => ({ err: String(e).slice(0, 100) }));
    console.log(tag + ' → ' + JSON.stringify(info));
  }
  await browser.close();
})();