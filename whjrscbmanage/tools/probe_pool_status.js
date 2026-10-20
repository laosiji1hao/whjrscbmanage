/** 业务管理（pool_list_all/pool_total_all）状态筛选探针：文字断言，不截图。
 * 校验：① 指定 p_status 时返回行状态全部匹配；② total 与列表一致；③ 空状态返回全量。 */
const { chromium } = require('playwright');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
const REPORT = '/busi_center/Finance_market_dept/whjrscbmange/data/whjrscbmanage_data.cpt';

async function data(page, ds, params) {
  const body = { report_path: REPORT, datasource_name: ds, page_number: -1, page_size: -1,
    parameters: params.map(p => ({ name: p.n, type: 'String', value: p.v })) };
  const res = await page.evaluate(async (b) => {
    const r = await fetch('/webroot/decision/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    return r.json();
  }, body);
  if (!res || res.err_code !== 0) throw new Error(ds + ' → ' + JSON.stringify(res).slice(0, 200));
  return res.data || [];
}
const listP = (status) => [
  { n: 'p_customer_name', v: '' }, { n: 'p_biz_name', v: '' }, { n: 'p_status', v: status },
  { n: 'p_pageno', v: '1' }, { n: 'p_pagesize', v: '100' }];
const totalP = (status) => [{ n: 'p_customer_name', v: '' }, { n: 'p_biz_name', v: '' }, { n: 'p_status', v: status }];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await login(page, BASE);
  let pass = 0, fail = 0;
  const check = (ok, msg) => { if (ok) { pass++; console.log('[OK] ' + msg); } else { fail++; console.log('[X] ' + msg); } };

  const allRows = await data(page, 'pool_list_all', listP(''));
  const allTotal = (await data(page, 'pool_total_all', totalP('')))[0];
  check(allRows.length === parseInt(allTotal.totalcnt, 10),
    `空状态：列表 ${allRows.length} 行 = total ${allTotal.totalcnt}`);

  for (const st of ['2', '3', '4']) {
    const rows = await data(page, 'pool_list_all', listP(st));
    const total = parseInt((await data(page, 'pool_total_all', totalP(st)))[0].totalcnt, 10);
    const bad = rows.filter(r => String(r.status) !== st);
    check(bad.length === 0, `状态=${st}：返回 ${rows.length} 行，状态全部匹配${bad.length ? '（异常 ' + bad.length + ' 行）' : ''}`);
    check(rows.length === total, `状态=${st}：列表 ${rows.length} 行 = total ${total}`);
  }

  console.log(`\nPASS ${pass} / FAIL ${fail}`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
