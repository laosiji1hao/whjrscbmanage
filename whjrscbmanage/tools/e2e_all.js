/**
 * 全模块端到端功能验证：4 模块 × 2 侧 × (新增 → 详情/修改 → 状态变更 → 删除)。
 * 填表不是写死字段，而是读 dump_fields.py 导出的 fields.json —— 也就是**生成页面时
 * 用的同一份规格**，所以「必填项能不能填、提交后落不落库」是逐模块真验的。
 *
 * 用法：node e2e_all.js [side] [mod]     不给参数则跑全部 8 个组合
 */
const { chromium } = require('playwright');
// 登录夹具在技能包里，不在本仓库：位置由 Agent 注入的 $FR_WORKSPACE 给出，
// 没设就退回本机默认安装点（这样在别的机器上 set FR_WORKSPACE=... 就能直接跑）。
const WS = process.env.FR_WORKSPACE || 'C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3';
const { login } = require(WS + '/foundation/tools/api_tester/fr_login');
const FIELDS = require('./fields.json');

// 本机开发服；换机器用 FR_BASE=http://host:port 覆盖
const WEBROOT = (process.env.FR_BASE || 'http://localhost:8075') + '/webroot';
const SIDES = {
    puhui: 'busi_center/inclusive_finance_dept/inclusive_mgmt',
    retail: 'busi_center/Retail_credit_dept/inclusive_mgmt'
};
// fields.json 是按 gen_pages.py 的中文侧名导出的
const SPEC = { puhui: '普惠', retail: '零售信贷' };
// 每模块列表页上一定显示的一个自由文本列 —— 用它当「这条是我刚插的」标记
const MARK_FIELD = {
    credit_renewal: 'mt_fac_name',
    non_profit_conversion: 'cms_cust_cd',
    prepayment: 'mt_fac_name',
    reserve_project: 'loan_type'
};

const DATE_V = '2026-09-01';
const DATETIME_V = '2026-09-02 10:00:00';
const DEBUG = process.env.DEBUG === '1';

// 零售的客户名称是**手输文本**、客户号按键反查（dict_customer_no 要求全等），
// 测试标记「自动化…」查不到真实客户 → 客户号下拉永远空。这里用种子真实客户名，
// 逐个试到客户号下拉有值（与 db/seed 的 fact_customer_info 保持同一批）。
const CUST_NAMES = ['武汉长江光电有限公司', '湖北汉江机械制造有限公司',
                    '黄石精密仪器有限公司', '武汉东湖新材料科技有限公司'];

let bad = [];
const ok = m => console.log(`    ✔ ${m}`);
function fail(m) { bad.push(m); console.log(`    ✘ ${m}`); }

// ── 通用操作 ────────────────────────────────────────────────────────────
async function pick(frame, id, avoidTitle, wantTitle) {
    // 点 .ant-select 外层：选中后 .ant-select-selection-item 会盖住内层 input
    await frame.locator('.ant-select:has(#' + id + ')').click();
    const dd = frame.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
    await dd.waitFor({ state: 'visible', timeout: 15000 });
    // rc-virtual-list 会先放一份 height:0 的量算副本，必须筛 :visible
    const opts = dd.locator('.ant-select-item-option:visible');
    try {
        await opts.first().waitFor({ state: 'visible', timeout: 15000 });
    } catch (e) {
        // 失败就报出**是哪个字段**，否则 pick 和 pickCustomerWithAccount 的
        // 调用栈长得一模一样，根本分不清卡在谁身上。
        console.log('  [pick 失败 ' + id + '] ' + JSON.stringify(await frame.locator('body')
            .evaluate((el, sid) => ({
                dds: Array.from(document.querySelectorAll('.ant-select-dropdown')).map(d => ({
                    cls: d.className.slice(0, 70), h: Math.round(d.getBoundingClientRect().height),
                    opts: d.querySelectorAll('.ant-select-item-option').length,
                    empty: d.querySelectorAll('.ant-select-item-empty').length,
                    txt: d.innerText.replace(/\n+/g, '|').slice(0, 90) })),
                selects: Array.from(document.querySelectorAll('.ant-select')).map(s => {
                    const i = s.querySelector('input[id]');
                    return (i ? i.id : '?') + (s.className.indexOf('ant-select-open') >= 0 ? '(open)' : '');
                }),
                thisSel: (function() {
                    const sel = document.querySelector('#' + sid);
                    if (!sel) return '(无此元素)';
                    const r = sel.getBoundingClientRect();
                    const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                    return { box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
                             disabled: sel.disabled, readOnly: sel.readOnly,
                             topAt: el ? el.className.toString().slice(0, 80) : null };
                })(),
            }), id)));
        throw e;
    }
    const n = await opts.count();
    for (let i = 0; i < n; i++) {
        const o = opts.nth(i);
        const t = ((await o.getAttribute('title')) || (await o.innerText()) || '').trim();
        if (avoidTitle && t === avoidTitle) continue;
        if (wantTitle && t !== wantTitle) continue;
        return o.click();
    }
    return opts.first().click();
}

async function setDate(frame, id, val) {
    const el = frame.locator('#' + id);
    await el.click();
    await el.fill(val);
    await el.press('Enter');
}

// 账户号下拉按客户号联动（dict_acct 带 loan_bal_r>0 过滤），种子里确有客户没有合格账户，
// 所以逐个客户试到能出账户为止 —— 顺带验证「选客户 → 账户号联动」这条链。
async function pickCustomerWithAccount(frame, page, id) {
    // reserve_project 这类模块压根没有账户号字段，别去做联动探测（会一直等不到元素）
    const hasAcct = await frame.locator('.ant-select:has(#new_bcs_acct_no)').count() > 0;
    await frame.locator('.ant-select:has(#' + id + ')').click();
    const dd = frame.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
    try {
        await dd.waitFor({ state: 'visible', timeout: 15000 });
        await dd.locator('.ant-select-item-option:visible').first().waitFor({ timeout: 15000 });
    } catch (e) {
        // 把下拉的真实状态打出来：是不存在、是空、还是被 :visible 筛掉了
        console.log('  [下拉诊断 ' + id + '] ' + JSON.stringify(await frame.locator('body')
            .evaluate((el, sid) => {
                const sel = document.querySelector('#' + sid);
                return {
                    dds: Array.from(document.querySelectorAll('.ant-select-dropdown')).map(d => ({
                        cls: d.className.slice(0, 70), h: Math.round(d.getBoundingClientRect().height),
                        opts: d.querySelectorAll('.ant-select-item-option').length,
                        empty: d.querySelectorAll('.ant-select-item-empty').length,
                        txt: d.innerText.replace(/\n+/g, '|').slice(0, 80) })),
                    selects: Array.from(document.querySelectorAll('.ant-select')).map(s => {
                        const i = s.querySelector('input[id]');
                        return (i ? i.id : '?') + (s.className.indexOf('ant-select-open') >= 0 ? '(open)' : '');
                    }),
                    thisSel: sel ? {
                        cls: (sel.closest('.ant-select') || {}).className,
                        disabled: sel.disabled, box: (function(x) {
                            const r = x.getBoundingClientRect();
                            return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
                        })(sel),
                        // 点击点上方究竟是谁（被谁挡住了？）
                        topAt: (function(x) {
                            const r = x.getBoundingClientRect();
                            const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                            return el ? el.className.toString().slice(0, 90) : null;
                        })(sel),
                    } : '(无此元素)',
                };
            }, id)));
        throw e;
    }
    if (!hasAcct) {
        await dd.locator('.ant-select-item-option:visible').first().click();
        await page.waitForTimeout(800);
        return true;
    }
    const n = await dd.locator('.ant-select-item-option:visible').count();
    for (let i = 0; i < n; i++) {
        await dd.locator('.ant-select-item-option:visible').nth(i).click();
        await page.waitForTimeout(1500);
        await frame.locator('.ant-select:has(#new_bcs_acct_no)').click();
        await page.waitForTimeout(1300);
        const cnt = await frame.locator(
            '.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option:visible').count();
        if (cnt > 0) {
            ok(`客户联动账户号：第 ${i + 1} 个客户可用`);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
            return true;
        }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        await frame.locator('.ant-select:has(#' + id + ')').click();
        await dd.locator('.ant-select-item-option:visible').first().waitFor({ timeout: 15000 });
    }
    fail('所有客户都选不出账户号（dict_acct 联动断了）');
    return false;
}

// 手输「客户名称」→ 等 dict_customer_no 反查 → 确认「客户号」下拉有选项。
// 有选项才证明这个真名被业务接纳，否则换下一个。返回是否成功。
async function chooseNameWithCustomers(frame, page) {
    for (const nm of CUST_NAMES) {
        await frame.locator('#cust_chinese_name').fill(nm);
        await page.waitForTimeout(1600);
        await frame.locator('.ant-select:has(#cust_name)').click();
        await page.waitForTimeout(1400);
        const cnt = await frame.locator(
            '.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option:visible').count();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        if (cnt) { ok('客户名称用种子真名「' + nm + '」，客户号下拉有 ' + cnt + ' 条'); return true; }
    }
    return false;
}

async function fillOne(frame, page, side, mod, f, mark) {
    const id = f.name;
    if (id === 'cust_name' || id === 'customer_name') {
        // prepayment 的字段顺序里 cust_name 排在 cust_chinese_name **前面**，
        // 到这里名称多半还没输入——先确保那边已经填了能出客户的真实名。
        if (await frame.locator('#cust_chinese_name').count()) {
            const v = await frame.locator('#cust_chinese_name').inputValue();
            if (!v && !(await chooseNameWithCustomers(frame, page))) {
                fail('所有种子客户名的客户号下拉都为空（dict_customer_no 反查断了？）');
                return false;
            }
        }
        return pickCustomerWithAccount(frame, page, id);
    }
    if (id === 'cust_chinese_name') {
        if (!(await chooseNameWithCustomers(frame, page))) {
            fail('所有种子客户名的客户号下拉都为空（dict_customer_no 反查断了？）');
            return false;
        }
        return true;
    }
    if (id === 'new_bcs_acct_no') { await pick(frame, id); return true; }   // 客户已选，此时有值
    if (f.kind === 'ref' || f.kind === 'pick') {
        // 企业标签特意选「其他」：这条支路有三处 origin 规则要看 ——
        // 手填框此时才挂载、手填内容必填（报「企业标签（选“其他”时的补充说明）」）、
        // 以及落库值取手填内容而不是字面「其他」。
        await pick(frame, id, null, id === 'enterprise_tag' ? '其他' : null);
    } else if (f.kind === 'date') {
        await setDate(frame, id, DATE_V);
    } else if (f.kind === 'datetime') {
        await setDate(frame, id, DATETIME_V);
    } else if (f.kind === 'number') {
        await frame.locator('#' + id).fill('100');
    } else {
        // text / textarea：电话类填个像样的号，其余一律打标记，保证列表里认得出这一行
        await frame.locator('#' + id).fill(/phone|telephone|tel/i.test(id) ? '13800000000' : mark);
    }
    await page.waitForTimeout(220);
    return true;
}

async function fillAll(frame, page, side, mod, mark) {
    for (const f of FIELDS[SPEC[side]][mod]) {
        if (!f.required) continue;
        if (!await fillOne(frame, page, side, mod, f, mark)) return false;
    }
    // 企业标签选了「其他」→ 手填框这时才在（tagOther），填个可检索的值，
    // 用来验证「落库值取手填内容」这条 origin 规则真的生效（列表企业标签列会显示它）。
    if (FIELDS[SPEC[side]][mod].some(x => x.name === 'enterprise_tag_other')) {
        await frame.locator('#enterprise_tag_other').waitFor({ state: 'visible', timeout: 15000 });
        await frame.locator('#enterprise_tag_other').fill(tagOf(mark));
    }
    await frame.locator('#' + MARK_FIELD[mod]).fill(mark);   // 标记列最后再写，覆盖掉默认值
    return true;
}
// 手填标签值：短（列宽窄）、且能从 mark 反推出来，便于断言
const tagOf = mark => 'T' + mark.slice(-6);

// 标签比字段名稳（弹窗里列的是中文标签）；orig 有几个标签带杂散括号（如「是否特别授信业务）」），
// 所以只按汉字比对
const cjk = s => String(s || '').replace(/[^一-龥]/g, '');

/**
 * 点确定 → 若弹出「以下字段不能为空」就按它列的字段补填再点一次。
 *
 * 这不是绕开校验，恰恰是**在验校验**：origin 的 validateStr 除了 antd 的 required，
 * 还有一层条件必填（如 credit_renewal：是否续贷=是 ⇒ 申报时间/办理状态/当前状态办理时间
 * 都必填）。这层只在提交时弹 Modal.warning 列举，不标红，所以脚本必须认得它，
 * 否则表现就是「点了确定毫无反应」（连 /api/data 都不会发）。
 */
async function submitForm(frame, page, side, mod, mark) {
    for (let attempt = 0; attempt < 4; attempt++) {
        await frame.getByRole('button', { name: /确\s*定|修\s*改/ }).click();
        await page.waitForTimeout(3500);
        // 弹窗在 **iframe 的 document** 里，不在父页：form 页的 React 根挂在 iframe 上，
        // antd 的 Modal 走 createPortal 到「当前 document 的 body」，所以父页查不到它
        // —— 用 page.locator 会永远 count=0，表现就是「条件必填没被识别」，白等到超时。
        const warn = frame.locator('.ant-modal-confirm').filter({ hasText: '以下字段不能为空' });
        if (!await warn.count()) return true;
        // 只取正文，别把页脚的「知道了」也算成一个字段名。
        // 另外字段是按空格分隔的：Modal.warning 的 content 里是 \n，但它渲染在
        // white-space:normal 的节点里，innerText 拿到的是折叠后的空格而不是换行。
        const labels = (await warn.last().locator('.ant-modal-confirm-content').innerText())
            .replace(/^[\s\S]*?不能为空[：:]*/, '')
            .split(/[\s ]+/).map(s => s.trim()).filter(Boolean);
        await warn.last().locator('button').last().click();     // 「知道了」
        await page.waitForTimeout(800);
        let filled = 0;
        for (const lb of labels) {
            const f = FIELDS[SPEC[side]][mod].find(x => cjk(x.label) === cjk(lb));
            if (!f) continue;
            await fillOne(frame, page, side, mod, f, mark);
            filled++;
        }
        if (DEBUG) console.log(`      [submit 第${attempt + 1}次] 条件必填=${labels.join('/')} 补填 ${filled} 个`);
        if (!filled) { fail(`条件必填弹窗列出的字段一个都没认出来：${labels.join('/')}`); return false; }
    }
    return false;
}

const totalOf = page => page.evaluate(() => {
    const m = document.body.innerText.match(/当前查询结果条数为：(\d+)/);
    return m ? parseInt(m[1], 10) : -1;
});
const rowTexts = page => page.evaluate(() => Array.from(
    document.querySelectorAll('.ant-table-tbody tr.ant-table-row'))
    .map(tr => tr.innerText.replace(/\s+/g, ' ')));

async function openModal(page, rowBtn, blockName) {
    if (rowBtn) await rowBtn.click();
    else await page.getByRole('button', { name: blockName }).first().click();
    const fr = page.frameLocator('.ant-modal iframe').last();
    await fr.locator('.ant-form-item').first().waitFor({ state: 'visible', timeout: 25000 });
    await page.waitForTimeout(1800);                      // 等字典异步加载
    return fr;
}

async function closeModal(page) {
    await page.locator('.ant-modal-close').last().click().catch(() => {});
    await page.waitForTimeout(1800);
}

/**
 * 详情弹窗里空的**必填**字段（返回它们的标签）。
 *
 * 专门盯一类缺陷：详情数据集的列名与表单字段名对不上时（如库列 cust_mgr_telephone
 * 而控件名 cust_mgr_phone），load_map 按名字逐字段回填就会把这个字段留空；它是必填，
 * 于是 antd 的 validateFields 拒绝、handleSubmit 的 .catch 静默吞掉，用户点「修改」
 * **毫无反应**（不弹提示、不发请求）。没有这道断言，症状只会表现成「保存后列表里看不到」，
 * 得一路挖到浏览器里才找得到根因。
 */
async function requiredEmpty(frame, side, mod) {
    const out = [];
    for (const f of FIELDS[SPEC[side]][mod]) {
        if (!f.required) continue;
        let v = '';
        try {
            if (f.kind === 'pick' || f.kind === 'ref') {
                const t = frame.locator('.ant-select:has(#' + f.name + ') .ant-select-selection-item');
                if (await t.count()) v = (await t.first().innerText()).trim();
            } else {
                const el = frame.locator('#' + f.name);
                if (await el.count()) v = (await el.first().inputValue()).trim();
            }
        } catch (e) { v = ''; }
        if (!v) out.push(f.label || f.name);
    }
    return out;
}

// ── 单模块全流程 ────────────────────────────────────────────────────────
async function runModule(page, side, mod) {
    const dir = SIDES[side];
    const mark = '自动化' + side.slice(0, 2) + mod.slice(0, 3) + Date.now().toString().slice(-5);
    const markField = MARK_FIELD[mod];
    console.log(`\n── ${side} / ${mod} ──`);
    await page.goto(`${WEBROOT}/decision/view/report?op=write&reportlet=${dir}/pages/${mod}_list.cpt`,
        { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ant-table-tbody tr.ant-table-row', { timeout: 25000 });
    const before = await totalOf(page);
    ok(`列表打开，条数 ${before}`);

    // 1. 新增
    const f1 = await openModal(page, null, /新增/);
    if (!await fillAll(f1, page, side, mod, mark)) return;
    await submitForm(f1, page, side, mod, mark);
    await page.waitForTimeout(3000);
    let rows = await rowTexts(page);
    if (!rows.some(r => r.includes(mark))) {
        fail(`新增后列表里找不到「${mark}」`); return;
    }
    ok(`新增成功：${before} → ${await totalOf(page)}`);
    // 企业标签列应显示手填内容（origin：选「其他」时落库值取右边手填内容，不落「其他」）
    if (FIELDS[SPEC[side]][mod].some(x => x.name === 'enterprise_tag_other')) {
        const r = rows.find(x => x.includes(mark)) || '';
        if (r.includes(tagOf(mark))) ok(`企业标签「其他」落库=手填内容「${tagOf(mark)}」`);
        else fail(`企业标签应落手填内容「${tagOf(mark)}」，实际行：${r.slice(0, 200)}`);
    }

    // 2. 详情回填 + 改备注
    const row = page.locator('.ant-table-tbody tr.ant-table-row', { hasText: mark }).first();
    const f2 = await openModal(page, row.getByRole('button', { name: '查看详情' }));
    const got = await f2.locator('#' + markField).inputValue();
    if (got === mark) ok(`详情回填正确（${markField}=「${got}」）`);
    else fail(`详情回填不对：${markField}=「${got}」，期望「${mark}」`);
    const miss = await requiredEmpty(f2, side, mod);
    if (!miss.length) ok('详情弹窗必填字段全部有值');
    else fail(`详情弹窗必填字段为空：${miss.join('、')}（回填列名与表单字段名对不上？）`);
    const memo = '备注' + mark;
    await f2.locator('#remarks').fill(memo);
    await submitForm(f2, page, side, mod, mark);
    await page.waitForTimeout(3000);
    if ((await rowTexts(page)).some(r => r.includes(memo))) ok('修改保存成功');
    else fail('修改后列表里看不到新备注');

    // 3. 状态变更
    const row3 = page.locator('.ant-table-tbody tr.ant-table-row', { hasText: mark }).first();
    const f3 = await openModal(page, row3.getByRole('button', { name: '修改状态' }));
    await pick(f3, 'processing_status');
    const st = (await f3.locator(
        '.ant-select:has(#processing_status) .ant-select-selection-item').innerText()).trim();
    await setDate(f3, 'processing_status_date', DATETIME_V);
    await submitForm(f3, page, side, mod, mark);
    await page.waitForTimeout(3000);
    const r3 = (await rowTexts(page)).find(r => r.includes(mark)) || '';
    if (st && r3.includes(st)) ok(`状态变更生效：「${st}」`);
    else fail(`状态变更后列表未见「${st}」：${r3.slice(0, 160)}`);

    // 4. 删除（勾选+批量删除 vs 行内删除弹窗，由 modes 给出，与生成器同源）
    const row4 = page.locator('.ant-table-tbody tr.ant-table-row', { hasText: mark }).first();
    if (FIELDS._modes[SPEC[side]][mod].batch) {
        await row4.locator('input[type=checkbox]').check();
        await page.getByRole('button', { name: '批量删除' }).click();
    } else {
        await row4.getByRole('button', { name: '删除' }).click();
    }
    await page.waitForTimeout(1500);
    // 只看**可见**的弹窗：antd 关掉的 Modal 仍留在 DOM 里（display:none），
    // 直接数 .ant-modal iframe 会把上一次的残留算进来，于是走错分支空等到超时。
    if (await page.locator('.ant-modal:visible iframe').count()) {
        const f4 = page.frameLocator('.ant-modal iframe').last();
        // 删除弹窗里**没有 Form**（page_tpl.py 的 mode==='delete' 分支只是一个提示 div
        // + 取消/确定），所以不能等 .ant-form-item —— 等按钮。
        await f4.getByRole('button', { name: /确\s*定/ }).waitFor({ state: 'visible', timeout: 25000 });
        await page.waitForTimeout(1200);
        await f4.getByRole('button', { name: /确\s*定/ }).click();
    } else {
        // 批量删除的 confirm 是 handleBatchDelete 里的 Modal.confirm(okButtonProps:{danger:true})，
        // 它的确定按钮**没有 .ant-btn-primary**（danger 覆盖了 type），按类名找必然 0 命中 —— 按文案找。
        await page.locator('.ant-modal-confirm:visible').last()
            .getByRole('button', { name: /确\s*定/ }).click();
    }
    await page.waitForTimeout(4500);
    if (!(await rowTexts(page)).some(r => r.includes(mark))) ok(`删除成功：条数回到 ${await totalOf(page)}`);
    else fail('删除后列表里仍有该记录');
    await closeModal(page);
}

(async () => {
    const wantSide = process.argv[2];
    const wantMod = process.argv[3];
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errs = [];
    // 平台自身那 4 条 ReferenceError 见 e2e_flow.js 的说明（帆软自带模板同样报）
    const NOISE = [/^qrcode is not defined$/, /^CryptoJS is not defined$/, /^BI is not defined$/];
    page.on('pageerror', e => {
        const m = String(e.message || e).split('\n')[0].trim();
        if (!NOISE.some(re => re.test(m))) errs.push(`${wantSide}/${wantMod}: ${m.slice(0, 160)}`);
    });
    await login(page, WEBROOT + '/decision/');

    for (const side of Object.keys(SIDES)) {
        if (wantSide && side !== wantSide) continue;
        for (const mod of Object.keys(FIELDS[SPEC[side]])) {
            if (wantMod && mod !== wantMod) continue;
            try { await runModule(page, side, mod); }
            catch (e) {
                // 头尾都要：头是「卡在哪个 locator」，而真正的原因
                // （不可见 / 被遮挡 / 元素不存在）在 Call log **末尾**那几行。
                const L = String(e).split('\n').map(s => s.trim()).filter(Boolean);
                fail(`${side}/${mod} 异常中断：` +
                     L.slice(0, 3).concat(['…'], L.slice(-8)).join(' ⏎ ').slice(0, 1400));
            }
        }
    }
    await browser.close();
    if (errs.length) { console.log('\n页面报错：'); errs.forEach(e => console.log('   ' + e)); }
    console.log('\n' + (bad.length || errs.length
        ? `❌ 失败 ${bad.length} 项` + (errs.length ? ` + ${errs.length} 条页面报错` : '')
        : '✅ 8 个组合全流程通过'));
    process.exit(bad.length || errs.length ? 1 : 0);
})();
