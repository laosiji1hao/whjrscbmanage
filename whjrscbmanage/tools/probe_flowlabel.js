/** 审批流标签探针（无截图）：真实后端 flow_NNN 应显示专用标签，不再落「审批中」兜底 */
const { chromium } = require('playwright');
const { spawnSync } = require('child_process');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
const PY = process.env.FR_PY || 'C:/Users/asus/AppData/Local/Programs/Python/Python312/python.exe';
const PAGE = BASE + '/decision/view/report?op=write&reportlet=busi_center/Finance_market_dept/whjrscbmange/pages/business_pool_view.cpt&t=' + Date.now();
const U = '4964ba7281df40daa9c70ced4a9a3984'; // b00001

function sql(script) { const r = spawnSync(PY, ['-c', script], { encoding: 'utf-8' }); if (r.status !== 0) console.log('SQLWARN ' + r.stderr); }

(async () => {
  let bad = 0; const ok = m => console.log('    ✔ ' + m); const fail = m => { bad++; console.log('    ✘ ' + m); };
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1900, height: 900 } });
  await login(page, BASE);

  async function setFlow(code) {
    sql(`import pymysql
c=pymysql.connect(host="127.0.0.1",port=3306,user="root",password="123456",charset="utf8mb4",autocommit=True,db="whjrscbmanage")
cur=c.cursor()
cur.execute("UPDATE iassist_flow_data SET approval_status=2 WHERE business_no='${U}' AND approval_status=0")
cur.execute("INSERT INTO iassist_flow_data (business_no,applicant_oa,flow_code,data,approval_status,update_time) VALUES ('${U}','admin','${code}','{}',0,NOW())")`);
  }
  async function clean() {
    sql(`import pymysql
c=pymysql.connect(host="127.0.0.1",port=3306,user="root",password="123456",charset="utf8mb4",autocommit=True,db="whjrscbmanage")
cur=c.cursor()
cur.execute("DELETE FROM iassist_flow_data WHERE business_no='${U}' AND flow_code LIKE 'flow_%' AND approval_status=0")`);
  }
  async function actionText() {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' });
    await page.locator('#app-root').waitFor({ timeout: 15000 });
    await page.waitForTimeout(2500);
    const row = page.locator('.ant-table-row').filter({ hasText: 'b00001' }).first();
    return (await row.innerText().catch(() => ''));
  }

  await setFlow('flow_006');
  let t = await actionText();
  ok1('flow_006 中止', t, '中止申请审批中');
  await clean();

  await setFlow('flow_001');
  t = await actionText();
  ok1('flow_001 新增', t, '新增申请审核中');
  await clean();

  await setFlow('flow_002');
  t = await actionText();
  ok1('flow_002 变更', t, '变更申请审批中');
  await clean();

  function ok1(tag, text, expect) { if (text.indexOf(expect) !== -1) ok(tag + ' → ' + expect); else fail(tag + ' 缺 ' + expect + '，实际:' + text.slice(-80)); }

  await clean();
  await browser.close();
  console.log('\nprobe fail=' + bad);
  process.exit(bad ? 1 : 0);
})();