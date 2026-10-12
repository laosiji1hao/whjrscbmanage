/* 全业务页面·字段填写规则审计探针（无截图）
 * 变体：business_form(add/edit/installment) + business_look(updaterType 0/1)
 * 规则①ECIF补零到17位 ②客户编号→ECIF回填(226010) ③客户编号→融资人名称回填
 */
const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
const P = 'busi_center/Finance_market_dept/whjrscbmange';
const U5 = 'a3b3c3d3000000000000000000000005';

const VARIANTS = [
  ['business_form 新增', BASE + '/decision/view/report?op=write&reportlet=' + P + '/pages/business_form.cpt&mode=add&biz_uuid=&t='],
  ['business_form 编辑', BASE + '/decision/view/report?op=write&reportlet=' + P + '/pages/business_form.cpt&mode=edit&biz_uuid=' + U5 + '&t='],
  ['business_form 分期', BASE + '/decision/view/report?op=write&reportlet=' + P + '/pages/business_form.cpt&mode=installment&biz_uuid=' + U5 + '&t='],
  ['business_look 查看', BASE + '/decision/view/report?op=write&reportlet=' + P + '/pages/business_look.cpt&biz_uuid=' + U5 + '&updaterType=0&t='],
  ['business_look 管理岗', BASE + '/decision/view/report?op=write&reportlet=' + P + '/pages/business_look.cpt&biz_uuid=' + U5 + '&updaterType=1&t='],
];

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1900, height: 950 } })).newPage();
  p.on('pageerror', e => { /* 忽略已知 noise */ });
  await login(p, BASE);
  for (const [label, url] of VARIANTS) {
    await p.goto(url + Date.now(), { waitUntil: 'domcontentloaded' });
    await p.locator('#app-root').waitFor({ timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(1300);
    let padOK = '?', ecifOK = '?', nameOK = '?';
    // ① 客户编号→ECIF 回填（清空 ECIF；客户编号用点击+键入+Tab 模拟真实输入触发 blur）
    const ecifPresent = await p.locator('#ecif_customer_no').count().catch(() => 0);
    if (ecifPresent) {
      await p.locator('#ecif_customer_no').fill('');
      await p.locator('#customer_no').fill('');   // 清空（编辑/分期/查看已有回填值）
      await p.locator('#customer_no').click();
      await p.keyboard.type('C0002');
      await p.locator('#customer_no').press('Tab');
      await p.waitForTimeout(1600);
      const e2 = await p.locator('#ecif_customer_no').inputValue().catch(() => '');
      ecifOK = String(e2).indexOf('ECIF_C0002') !== -1 ? 'PASS(' + e2 + ')' : 'FAIL(' + e2 + ')';
      const nm = await p.locator('#customer_name').inputValue().catch(() => '');
      nameOK = String(nm).length > 0 ? 'PASS(' + nm.slice(0, 8) + ')' : 'FAIL(空)';
      // ② ECIF 补零到 17 位（在回填出的值上改为手工 123 → 应补成 00000000000000123）
      await p.locator('#ecif_customer_no').fill('123');
      await p.locator('#ecif_customer_no').evaluate(el => el.blur());
      await p.waitForTimeout(400);
      const v = await p.locator('#ecif_customer_no').inputValue().catch(() => '');
      padOK = (v === '00000000000000123') ? 'PASS' : 'FAIL(' + v + ')';
    } else {
      padOK = 'NO_ECIF_FIELD'; ecifOK = 'NO_ECIF_FIELD'; nameOK = 'NO_ECIF_FIELD';
    }
    console.log(label + ' | ECIF补零=' + padOK + ' | 客户号ECIF回填=' + ecifOK + ' | 名称回填=' + nameOK);
  }
  await b.close();
})();