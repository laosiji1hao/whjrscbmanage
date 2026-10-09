/* 文字探针：还款计划弹窗内「新增行」后的表格 DOM 结构（无截图） */
const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  await login(page, BASE);
  await page.goto(BASE + '/decision/view/report?op=write&reportlet=whjrscbmanage/pages/business_form.cpt&mode=add&id=0&t=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.locator('#app-root').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.locator('.ant-select:has(#installment_flag)').click();
  const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  await dd.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  await dd.locator('.ant-select-item-option:visible').filter({ hasText: '是' }).first().click().catch(() => {});
  await page.waitForTimeout(500);
  await page.locator('button:has-text("添加还款计划")').click();
  await page.locator('iframe#planFrame').waitFor({ timeout: 15000 });
  const plan = page.frameLocator('iframe#planFrame');
  await plan.locator('#app-root').waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  const before = await plan.locator('.ant-table-tbody tr').count().catch(() => -1);
  console.log('点击前 tbody tr 数=' + before);
  await plan.locator('button:has-text("新增行")').click();
  await page.waitForTimeout(1500);
  const after = await plan.locator('.ant-table-tbody tr').count().catch(() => -1);
  console.log('点击后 tbody tr 数=' + after);
  const trs = after;
  for (let i = 0; i < Math.min(trs, 3); i++) {
    const tr = plan.locator('.ant-table-tbody tr').nth(i);
    console.log('  tr' + i + ' html[:260]=' + String(await tr.innerHTML().catch(() => '')).replace(/\n/g, ' ').slice(0, 260));
    console.log('  tr' + i + ' picker=' + await tr.locator('.ant-picker input').count().catch(() => -1) + ' numinput=' + await tr.locator('.ant-input-number-input').count().catch(() => -1));
  }
  await browser.close();
})();