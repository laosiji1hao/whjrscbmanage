const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  await login(page, BASE);
  await page.goto(BASE + '/decision/view/report?op=write&reportlet=whjrscbmanage/pages/business_list.cpt', { waitUntil: 'domcontentloaded' });
  await page.locator('#app-root').waitFor({ timeout: 15000 });
  await page.locator('button:has-text("新增业务")').click();
  await page.locator('iframe#modalFrame').waitFor({ timeout: 15000 });
  const form = page.frameLocator('iframe#modalFrame');
  await form.locator('#app-root').waitFor({ timeout: 15000 });
  // set installment_flag=是 以解锁添加还款计划
  await form.locator('.ant-select:has(#installment_flag)').click();
  await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last().waitFor({ timeout: 8000 }).catch(()=>{});
  const opts = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option:visible');
  await opts.filter({ hasText: '是' }).first().click();
  await page.waitForTimeout(400);
  await form.locator('button:has-text("添加还款计划")').click();
  await page.waitForTimeout(4000);
  const frameCount = page.frames().length;
  console.log('frames:', frameCount);
  page.frames().forEach(f => console.log('  frame url:', f.url().slice(0, 130)));
  // 检查 planFrame 内
  const pf = page.frames().find(f => f.url().indexOf('installment_ment') !== -1);
  if (pf) {
    const app = await pf.locator('#app-root').count().catch(() => -1);
    const txt = await pf.locator('body').innerText().catch(() => '');
    console.log('planFrame #app-root count:', app, 'body:', txt.replace(/\n+/g,' ').slice(0,150));
  } else console.log('未找到 installment_ment frame');
  await browser.close();
})();
