const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
const UUID = '4964ba7281df40daa9c70ced4a9a3984'; // b00001
const URL = BASE + '/decision/view/report?op=write&reportlet=busi_center/Finance_market_dept/whjrscbmange/pages/business_look.cpt&biz_uuid=' + UUID + '&updaterType=0&t=' + Date.now();
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  await login(p, BASE);
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.locator('#app-root').waitFor({ timeout: 20000 });
  await p.waitForTimeout(2000);
  const val = await p.locator('.ant-form-item:has(#five_level_class) .ant-select-selection-item').first().innerText().catch(() => '');
  await p.locator('.ant-select:has(#five_level_class)').click();
  const dd = p.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  await dd.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  const opts = await dd.locator('.ant-select-item-option').allInnerTexts().catch(() => []);
  console.log('当前值:', JSON.stringify(val.trim()));
  console.log('选项:', JSON.stringify(opts));
  const ok = opts.length === 1 && opts[0].trim() === '正常一档';
  console.log(ok ? 'PASS 只剩正常一档' : 'FAIL 选项数=' + opts.length);
  await b.close(); process.exit(ok ? 0 : 1);
})();
