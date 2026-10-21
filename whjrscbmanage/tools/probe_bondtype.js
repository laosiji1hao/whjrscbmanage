/** 业务类型默认值探针（无截图）：新增→标准(0)；完善(status=0 草稿)→非标准(1) */
const { chromium } = require('playwright');
const { spawnSync } = require('child_process');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
const PY = process.env.FR_PY || 'C:/Users/asus/AppData/Local/Programs/Python/Python312/python.exe';
const PAGE = p => BASE + '/decision/view/report?op=write&reportlet=busi_center/Finance_market_dept/whjrscbmange/pages/' + p + '&t=' + Date.now();
const UUID = 'probe0000000000000000000000000001';

function sql(script) {
  const r = spawnSync(PY, ['-c', script], { encoding: 'utf-8' });
  if (r.status !== 0) console.log('SQL WARN: ' + r.stderr);
}

(async () => {
  let bad = 0;
  const ok = m => console.log('    ✔ ' + m);
  const fail = m => { bad++; console.log('    ✘ ' + m); };

  sql(`import pymysql
c=pymysql.connect(host="127.0.0.1",port=3306,user="root",password="123456",charset="utf8mb4",autocommit=True,db="whjrscbmanage")
cur=c.cursor()
cur.execute("DELETE FROM bus_bond_business WHERE biz_uuid='${UUID}'")
cur.execute("INSERT INTO bus_bond_business (biz_uuid,bond_code,status,creator,org_code,org_name,biz_name,bond_type) VALUES ('${UUID}','BT-PROBE',0,'admin','001','武汉营业部','类型默认值探针',NULL)")`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await login(page, BASE);

  const bondLabel = async () => {
    await page.locator('#app-root').waitFor({ timeout: 15000 });
    await page.waitForTimeout(1200);
    const t = await page.locator('.ant-form-item:has(#bond_type) .ant-select-selection-item').first().innerText().catch(() => '');
    return t.trim();
  };

  await page.goto(PAGE('business_form.cpt&mode=add'), { waitUntil: 'domcontentloaded' });
  let v = await bondLabel();
  if (v === '标准化业务') ok('新增默认 标准业务(0)'); else fail('新增默认 label=' + JSON.stringify(v));

  await page.goto(PAGE('business_form.cpt&mode=edit&biz_uuid=' + UUID), { waitUntil: 'domcontentloaded' });
  v = await bondLabel();
  if (v === '非标准化业务') ok('完善(status=0)默认 非标准业务(1)'); else fail('完善默认 label=' + JSON.stringify(v));

  await browser.close();
  sql(`import pymysql
c=pymysql.connect(host="127.0.0.1",port=3306,user="root",password="123456",charset="utf8mb4",autocommit=True,db="whjrscbmanage")
cur=c.cursor()
cur.execute("DELETE FROM bus_bond_business WHERE biz_uuid='${UUID}'")`);
  console.log('\nprobe fail=' + bad);
  process.exit(bad ? 1 : 0);
})();