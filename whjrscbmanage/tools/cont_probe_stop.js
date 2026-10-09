/* 文字探针：business_pool 中止确认弹窗实际 DOM（无截图） */
const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONS ' + m.text().slice(0, 160)); else if (m.type() === 'warning') errs.push('WARN ' + m.text().slice(0, 180)); });
  await login(page, BASE);
  await page.goto(BASE + '/decision/view/report?op=write&reportlet=whjrscbmanage/pages/business_pool.cpt&mode=view&t=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.locator('#app-root').waitFor({ timeout: 20000 });
  await page.waitForTimeout(2000);
  const rows = await page.locator('.ant-table-tbody .ant-table-row').count();
  console.log('rows=' + rows);
  // 打印所有行文本开头，找出 BC000001
  for (let i = 0; i < Math.min(rows, 8); i++) {
    const t = await page.locator('.ant-table-tbody .ant-table-row').nth(i).innerText().catch(() => '');
    console.log('row' + i + ': ' + t.replace(/\n/g, '|').slice(0, 150));
  }
  const target = page.locator('.ant-table-tbody .ant-table-row:has-text("BC000001")');
  console.log('BC000001 row count=' + await target.count());
  const btns = target.locator('button');
  console.log('row buttons=' + await btns.count());
  for (let i = 0; i < await btns.count(); i++) {
    console.log('  btn' + i + ' text=' + JSON.stringify(await btns.nth(i).innerText()));
  }
  await btns.filter({ hasText: /中\s*止/ }).first().click();
  await page.waitForTimeout(1200);
  const modals = await page.locator('.ant-modal').count();
  console.log('modal 数=' + modals);
  for (let i = 0; i < modals; i++) {
    const m = page.locator('.ant-modal').nth(i);
    console.log('  modal' + i + ' text=' + JSON.stringify((await m.innerText().catch(() => '')).replace(/\n/g, '|').slice(0, 160)));
    const mbtns = m.locator('.ant-modal-footer button');
    for (let j = 0; j < await mbtns.count(); j++) {
      console.log('    mbtn' + j + ' text=' + JSON.stringify(await mbtns.nth(j).innerText()) + ' cls=' + String(await mbtns.nth(j).getAttribute('class')));
    }
  }
  const mRoot = await page.locator('.ant-modal-root, .ant-confirm, .ant-message').count();
  console.log('modal-root/confirm/message 数=' + mRoot);
  console.log('message 内容: ' + JSON.stringify(await page.locator('.ant-message').innerText().catch(() => '')));
  console.log('modal-mask 数: ' + await page.locator('.ant-modal-mask').count().catch(() => -1));
  const modalCls = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('body *').forEach(e => {
      const cn = e.className && typeof e.className === 'string' ? e.className : '';
      if (/ant-(modal|confirm|popup|notification)/i.test(cn)) out.push(cn.slice(0, 80));
    });
    return out.slice(0, 12);
  });
  console.log('modal-ish classes: ' + JSON.stringify(modalCls));
  const modalInfo = await page.evaluate(() => {
    return { hasAntd: typeof window.antd !== 'undefined', hasModal: typeof window.antd !== 'undefined' && !!window.antd.Modal, hasConfirm: typeof window.antd !== 'undefined' && !!window.antd.Modal && typeof window.antd.Modal.confirm === 'function' };
  });
  console.log('antd 可用性: ' + JSON.stringify(modalInfo));
  errs.filter(e => !/qrcode|CryptoJS|BI is not defined/.test(e)).slice(0, 8).forEach(e => console.log('ERR ' + e));
  await browser.close();
})();