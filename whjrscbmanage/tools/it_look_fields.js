/** 编辑页字段误报 UI 端到端测试（无截图）：
 * 打开 business_look（真实后端 9059 + gateway 9058）→ 只改批复管理要求 → 确定
 * → 查 iassist_flow_data.update_context，断言不含「检查频率」「上存利率」。
 * 前置：后端 9059、gateway 9058、FR 8075 均已启动。
 */
const { chromium } = require('playwright');
const { spawnSync } = require('child_process');
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const BASE = 'http://localhost:8075/webroot';
const PY = process.env.FR_PY || 'C:/Users/asus/AppData/Local/Programs/Python/Python312/python.exe';
const UUID = 'ITLOOK0000000000000000000000001';
const BOND = 'ITLOOK001';
const PLAN = '[{"installmentTime":"2027-01-01","installmentAmount":"100"}]';
const PAGE = BASE + '/decision/view/report?op=write&reportlet=busi_center/Finance_market_dept/whjrscbmange/pages/business_look.cpt&biz_uuid=' + UUID + '&updaterType=0&t=' + Date.now();
let bad = 0;
const ok = m => console.log('    ✔ ' + m);
const fail = m => { bad++; console.log('    ✘ ' + m); };
function py(code) { const r = spawnSync(PY, ['-c', code], { encoding: 'utf-8', env: Object.assign({}, process.env, { PYTHONIOENCODING: 'utf-8' }) }); if (r.status !== 0) console.log('PYERR ' + r.stderr); return r.stdout; }

const SEED = `import pymysql
c=pymysql.connect(host="127.0.0.1",port=3306,user="root",password="123456",charset="utf8mb4",db="whjrscbmanage",autocommit=True)
cur=c.cursor()
cur.execute("DELETE FROM iassist_flow_data WHERE business_no='${UUID}'")
cur.execute("DELETE FROM bus_bond_business WHERE biz_uuid='${UUID}'")
cur.execute("""INSERT INTO bus_bond_business
 (biz_uuid,bond_code,ecif_customer_no,customer_no,customer_name,biz_name,bond_type,green_tech_flag,
  ext_rating,ext_rating_date,rating_agency,int_rating,int_rating_date,lead_underwriter,is_passage,
  upper_storage_rate,alert_customer,biz_type,remark_number,industry,customer_type,start_date,mature_date,
  currency,orig_amount,rmb_amount,balance,invest_rate,transfer_rate,guarantee_info,breach_flag,
  five_level_class,fund_used_flag,fund_used_up,installment_flag,installment_plan,our_bank_underwrite,
  manage_line,dept,agreed_usage,fund_account_flag,supervise_account_flag,is_original_am,exercise_flag,
  remark,js_remark_flag,inspect_freq,inspector_post,status,creator,org_code,org_name)
 VALUES ('${UUID}','${BOND}','00000000000000001','C0001','湖北某某企业','IT编辑字段测试','0','0',
  'AAA','2026-01-01','标准普尔','AA+','2026-01-02','中金公司','0',
  9.99,'0','0','P-001','1','0','2026-01-01','2027-01-01',
  '人民币',100,100,100,4.0,1.5,'0','0',
  '正常一档','0','0','1','${PLAN}','1',
  '金融市场部','0','流动资金贷款','0','0','0','0',
  'old','0','1','客户经理',3,'admin','001','武汉营业部')""")`;
const QUERY = `import pymysql,json
c=pymysql.connect(host="127.0.0.1",port=3306,user="root",password="123456",charset="utf8mb4",db="whjrscbmanage")
cur=c.cursor()
cur.execute("SELECT data FROM iassist_flow_data WHERE business_no='${UUID}' ORDER BY id DESC LIMIT 1")
r=cur.fetchone()
ctx=None
if r:
    for it in json.loads(r[0]).get("data",[]):
        if it.get("fieldName")=="update_context": ctx=it.get("value")
print(json.dumps({"ctx":ctx},ensure_ascii=False))`;
const CLEAN = `import pymysql
c=pymysql.connect(host="127.0.0.1",port=3306,user="root",password="123456",charset="utf8mb4",db="whjrscbmanage",autocommit=True)
cur=c.cursor()
cur.execute("DELETE FROM iassist_flow_data WHERE business_no='${UUID}'")
cur.execute("DELETE FROM bus_bond_business WHERE biz_uuid='${UUID}'")`;

(async () => {
  py(SEED);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await login(page, BASE);
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await page.locator('#app-root').waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500);

  // 断言回显：检查频率=1、上存利率=9.99（未被配置覆盖）
  const inf = await page.locator('.ant-form-item:has(#inspect_freq) input').inputValue().catch(() => '');
  const up = await page.locator('.ant-form-item:has(#upper_storage_rate) input').inputValue().catch(() => '');
  if (String(inf).trim() === '1') ok('检查频率回显=1（未被重算）'); else fail('检查频率回显=' + inf);
  if (Math.abs(parseFloat(up) - 9.99) < 1e-6) ok('上存利率回显=9.99（未被配置覆盖）'); else fail('上存利率回显=' + up);

  await page.locator('#remark').fill('ui-test');
  await page.locator('button').filter({ hasText: /确\s*定/ }).first().click();
  await page.waitForTimeout(4000);

  const out = py(QUERY).trim().split('\n').pop();
  let ctx = null;
  try { ctx = JSON.parse(out).ctx; } catch (e) {}
  if (ctx !== null && ctx.indexOf('检查频率') === -1) ok('update_context 不含检查频率 | ' + ctx); else fail('update_context 含检查频率 | ' + ctx);
  if (ctx !== null && ctx.indexOf('上存利率') === -1) ok('update_context 不含上存利率'); else fail('update_context 含上存利率 | ' + ctx);
  if (ctx !== null && ctx.indexOf('批复管理要求') !== -1) ok('其他字段变更已记录'); else fail('未记录批复管理要求 | ' + ctx);

  await browser.close();
  py(CLEAN);
  console.log('\n编辑页字段误报测试 fail=' + bad);
  process.exit(bad ? 1 : 0);
})();