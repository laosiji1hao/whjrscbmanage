/** 数据层 /api/data 探针：登录帆软后逐个 POST /api/data 并校验 err_code===0 */
const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
const CPT = '/webroot/decision/api/data';

const D = [
  ['declare_list', [{n:'p_operator',t:'String',v:'admin'},{n:'p_customer_name',t:'String',v:''}]],
  ['declare_customer_opt', [{n:'p_operator',t:'String',v:'admin'}]],
  ['get_business', [{n:'p_biz_uuid',t:'String',v:'c8d8e8f8000000000000000000000001'}]],
  ['config_get', []],
  ['pool_list_mine', [{n:'p_operator',t:'String',v:'admin'},{n:'p_customer_name',t:'String',v:''},{n:'p_biz_name',t:'String',v:''},{n:'p_status',t:'String',v:''},{n:'p_pageno',t:'String',v:'1'},{n:'p_pagesize',t:'String',v:'20'},{n:'p_cutpage',t:'String',v:''}]],
  ['pool_total_mine', [{n:'p_operator',t:'String',v:'admin'},{n:'p_customer_name',t:'String',v:''},{n:'p_biz_name',t:'String',v:''},{n:'p_status',t:'String',v:''}]],
  ['pool_list_all', [{n:'p_customer_name',t:'String',v:''},{n:'p_biz_name',t:'String',v:''},{n:'p_status',t:'String',v:''},{n:'p_pageno',t:'String',v:'1'},{n:'p_pagesize',t:'String',v:'20'},{n:'p_cutpage',t:'String',v:''}]],
  ['pool_total_all', [{n:'p_customer_name',t:'String',v:''},{n:'p_biz_name',t:'String',v:''},{n:'p_status',t:'String',v:''}]],
  ['pool_filter_opt', []],
  ['audit_all', []],
  ['manager_options', []],
  ['org_options', []],
];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await login(page, BASE);
  let pass = 0, fail = 0;
  for (const [ds, params] of D) {
    const body = { report_path: '/busi_center/Finance_market_dept/whjrscbmange/data/whjrscbmanage_data.cpt', datasource_name: ds,
      page_number: -1, page_size: -1,
      parameters: params.map(p => ({ name: p.n, type: p.t, value: p.v })) };
    const res = await page.evaluate(async (b) => {
      const r = await fetch(b.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b.body) });
      return r.json();
    }, { url: '/webroot/decision/api/data', body });
    const ok = res && res.err_code === 0;
    if (!ok) { fail++; console.log('✘ ' + ds + ' → ' + JSON.stringify(res).slice(0, 200)); }
    else { pass++; console.log('✔ ' + ds + ' rows=' + (res.data && res.data.length)); }
  }
  console.log('\nPASS ' + pass + ' / FAIL ' + fail);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
