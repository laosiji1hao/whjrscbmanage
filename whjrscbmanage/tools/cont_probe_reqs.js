/* 文字探针：验证 4 条需求（无截图）
 * ① pool_view 无标题/新增按钮 ② 下拉筛选有选项 ③ 新增业务弹窗打开 ④ look 两列布局
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

  // ① 新增业务弹窗 + ② 下拉
  await page.goto(BASE + '/decision/view/report?op=write&reportlet=' + P + '/pages/business_pool_view.cpt&t=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.locator('#app-root').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  const hasTitle = (await page.locator('#app-root').innerText()).indexOf('金市业务') !== -1;
  console.log('pool_view 含“金市业务”标题: ' + hasTitle + '（应为 false）');
  const addBtn = page.locator('#app-root').locator('button').filter({ hasText: /新\s*增/ });
  console.log('新增业务按钮数=' + await addBtn.count());
  // 融资人名称下拉有选项
  await page.locator('.ant-select:has(#cust_name)').click().catch(function(){});
  // 下拉可能没有 id，改用占位文案定位
  const selWrap = page.locator('.ant-select:has(input[placeholder="全部"])').first();
  await selWrap.click().catch(function(){});
  await page.waitForTimeout(600);
  const optN = await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option:visible').count().catch(function(){ return -1; });
  console.log('下拉选项数=' + optN);
  await page.keyboard.press('Escape');
  await addBtn.first().click();
  await page.locator('iframe#poolFrame').waitFor({ timeout: 15000 });
  const ff = page.frames().find(f => f.url().indexOf('business_form') !== -1);
  console.log('新增业务弹窗打开: ' + (ff ? 'yes (' + ff.url().split('?')[1].slice(0, 40) + ')' : 'NO'));
  await browser.close();

  // ④ look 两列
  const b2 = await chromium.launch();
  const p2 = await (await b2.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  await login(p2, BASE);
  await p2.goto(BASE + '/decision/view/report?op=write&reportlet=' + P + '/pages/business_look.cpt&id=5&updaterType=0&t=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await p2.locator('#app-root').waitFor({ timeout: 20000 });
  await p2.waitForTimeout(1500);
  const col12 = await p2.locator('.ant-col-12, [class*="ant-col-12"]').count().catch(function(){ return -1; });
  const col8 = await p2.locator('.ant-col-8, [class*="ant-col-8"]').count().catch(function(){ return -1; });
  console.log('look 列: col-12=' + col12 + ' col-8=' + col8 + '（col-8 应为 0）');
  await b2.close();
})();