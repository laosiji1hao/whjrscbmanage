const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  await login(page, BASE);
  await page.goto(BASE + '/decision/view/report?op=write&reportlet=whjrscbmanage/pages/business_list.cpt', { waitUntil: 'domcontentloaded' });
  await page.locator('#app-root').waitFor({ timeout: 15000 });
  await page.locator('button:has-text("新增业务")').click();
  await page.locator('iframe#modalFrame').waitFor({ timeout: 15000 });
  page.frames().forEach(f => console.log('FRAME: ' + f.url().slice(0,150)));
  const frame = page.frames().find(f => f.url().indexOf('business_form') !== -1);
  if (frame) {
    const info = await frame.evaluate(() => {
      let rn = ''; try { rn = String(FR.remoteEvaluate('=reportName') || ''); } catch (e) { rn = 'ERR ' + e.message; }
      let su = ''; try { su = String(FR.remoteEvaluate('=servletURL') || ''); } catch (e) { su = 'ERR'; }
      return { reportName: rn, servletURL: su, href: window.location.href.slice(0, 160) };
    });
    console.log(JSON.stringify(info, null, 2));
  } else console.log('no business_form frame');
  await browser.close();
})();
