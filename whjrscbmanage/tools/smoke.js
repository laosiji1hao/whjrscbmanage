/* 页面冒烟测试：登录后逐个打开页面，检查 app-root 渲染 + console 错误 */
const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';

const PAGES = [
  ['business_list', {}],
  ['business_pool', { mode: 'view' }],
  ['business_pool', { mode: 'manager' }],
  ['business_form', { mode: 'add', id: '0' }],
  ['business_form', { mode: 'edit', id: '5' }],
  ['business_form', { mode: 'installment', id: '5' }],
  ['installment_ment', { bond_code: 'BC000002', type: '0' }],
  ['business_look', { id: '5', updaterType: '0' }],
  ['manager_change', { id: '5', updaterType: '0' }],
  ['config', {}]
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  await login(page, BASE);
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));

  let fail = 0;
  for (const [name, params] of PAGES) {
    errors.length = 0;
    const qs = new URLSearchParams(params).toString();
    const url = BASE + '/decision/view/report?op=write&reportlet=whjrscbmanage/pages/' + name + '.cpt' + (qs ? '&' + qs : '') + '&t=' + Date.now();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('#app-root > *', { timeout: 15000 });
      await page.waitForTimeout(1500);
      const app = await page.locator('#app-root').innerText();
      const realErr = errors.filter(e =>
          !e.includes('favicon') && !e.includes('Failed to load resource') &&
          !/qrcode is not defined/.test(e) && !/CryptoJS is not defined/.test(e) &&
          !/BI is not defined/.test(e));
      const hasErr = realErr.length > 0;
      if (hasErr) { fail++; console.log('✘ ' + name + (params.mode ? '(' + params.mode + ')' : '') + ' JS错误: ' + realErr.slice(0,3).join(' | ').slice(0,300)); }
      else console.log('✔ ' + name + (params.mode ? '(' + params.mode + ')' : '') + ' app=' + app.replace(/\n+/g, ' ').slice(0, 90));
    } catch (e) {
      fail++; console.log('✘ ' + name + ' 加载失败: ' + e.message.slice(0, 200));
    }
  }
  console.log('\n冒烟结果：FAIL=' + fail);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
