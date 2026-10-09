const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
const which = process.argv[2] || 'pool_list_mine';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await login(page, BASE);
  const body = { report_path: '/whjrscbmanage/data/whjrscbmanage_data.cpt', datasource_name: which,
    page_number: -1, page_size: -1, parameters: [
    {name:'p_operator',type:'String',value:'admin'},{name:'p_customer_name',type:'String',value:''},
    {name:'p_biz_name',type:'String',value:''},{name:'p_status',type:'String',value:''},
    {name:'p_pageno',type:'String',value:'1'},{name:'p_pagesize',type:'String',value:'20'},{name:'p_cutpage',type:'String',value:''}] };
  const r = await page.evaluate(async (b) => {
    try {
      const resp = await fetch('/webroot/decision/api/data', { method:'POST',
        headers:{'Content-Type':'application/json'}, body: JSON.stringify(b.body) });
      const txt = await resp.text();
      return { status: resp.status, body: txt.slice(0, 1500) };
    } catch (e) { return { status: 0, body: String(e) }; }
  }, { body });
  console.log('HTTP', r.status);
  console.log(r.body);
  await browser.close();
})();
