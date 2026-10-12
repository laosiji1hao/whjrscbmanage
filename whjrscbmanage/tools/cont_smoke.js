/* 无截图冒烟：7 页面 10 种入口渲染检查（app-root 内容 + JS 错误） */
const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';

const PAGES = [
  ['business_list', {}],
  ['business_pool_view', {}],
  ['business_pool_manager', {}],
  ['business_form', { mode: 'add', biz_uuid: '' }],
  ['business_form', { mode: 'edit', biz_uuid: 'a3b3c3d3000000000000000000000005' }],
  ['business_form', { mode: 'installment', biz_uuid: 'a3b3c3d3000000000000000000000005' }],
  ['installment_ment', { bond_code: 'BC000002', type: '0' }],
  ['business_look', { biz_uuid: 'a3b3c3d3000000000000000000000005', updaterType: '0' }],
  ['manager_change', { biz_uuid: 'a3b3c3d3000000000000000000000005', updaterType: '0' }],
  ['config', {}]
];
const IGNORE = /qrcode|CryptoJS|BI is not defined|plugin\.page\.table|plugin\.model\.page\.table|defaultsimple|constant:|font:|Failed to load resource/;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1900, height: 950 } });
  const page = await ctx.newPage();
  await login(page, BASE);
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));

  let fail = 0;
  for (const [name, params] of PAGES) {
    errors.length = 0;
    const qs = new URLSearchParams(params).toString();
    const url = BASE + '/decision/view/report?op=write&reportlet=busi_center/Finance_market_dept/whjrscbmange/pages/' + name + '.cpt' + (qs ? '&' + qs : '') + '&t=' + Date.now();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('#app-root > *', { timeout: 15000 });
      await page.waitForTimeout(1500);
      const app = await page.locator('#app-root').innerText();
      const realErr = errors.filter(e => !IGNORE.test(e));
      if (realErr.length) { fail++; console.log('✘ ' + name + (params.mode ? '(' + params.mode + ')' : '') + ' JS错误: ' + realErr.slice(0, 3).join(' | ').slice(0, 220)); }
      else console.log('✔ ' + name + (params.mode ? '(' + params.mode + ')' : '') + ' app=' + app.replace(/\n+/g, ' ').slice(0, 80));
    } catch (e) {
      fail++; console.log('✘ ' + name + (params.mode ? '(' + params.mode + ')' : '') + ' 加载失败: ' + e.message.slice(0, 160));
    }
  }
  console.log('\n冒烟结果：FAIL=' + fail);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();