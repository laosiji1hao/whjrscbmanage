/* 合并 prelude + 页面体 + 渲染尾部 → pages/<name>.jsx
 * 用法：node gen_pages.js [page...]    （不给参数则全部）
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PRELUDE = fs.readFileSync(path.join(__dirname, 'prelude.part.js'), 'utf8');

const RENDER = `
ReactDOM.createRoot(document.getElementById('app-root')).render(
    React.createElement(antd.ConfigProvider, { locale: zhCN },
        React.createElement(App)
    )
);
`;

const PAGES = ['business_pool', 'business_pool_view', 'business_pool_manager',
               'business_list', 'business_form', 'installment_ment',
               'business_look', 'manager_change', 'config'];

// 同一份 page 体生成多个物理 cpt 的变体（原因：菜单挂载只能选 cpt、不能带查询参数；
// 故按角色拆成独立 cpt 文件，内部用注入的固定 mode 区分）。值为生成时注入的变量行。
const VARIANTS = {
    business_pool_view: { part: 'business_pool', force: "var WINDOW_POOL_MODE = 'view';" },
    business_pool_manager: { part: 'business_pool', force: "var WINDOW_POOL_MODE = 'manager';" }
};

const only = process.argv.slice(2);
const outDir = path.join(ROOT, 'pages');
fs.mkdirSync(outDir, { recursive: true });

// 变体页共享父 page 体：传父名（business_pool）要连变体一起重建，传变体名则只建变体
function partOf(name) { return VARIANTS[name] ? VARIANTS[name].part : name; }
const want = function(name) {
    if (!only.length) return true;
    if (only.includes(name)) return true;
    return only.includes(partOf(name));
};

let done = 0;
for (const name of PAGES) {
    if (!want(name)) continue;
    const rec = VARIANTS[name];
    const bodyFile = path.join(ROOT, 'pages_src', (rec ? rec.part : name) + '.part.js');
    if (!fs.existsSync(bodyFile)) { console.error('缺少页面体：' + bodyFile); continue; }
    const body = fs.readFileSync(bodyFile, 'utf8');
    const jsx = PRELUDE + '\n' + (rec ? rec.force + '\n' : '') + body + '\n' + RENDER;
    fs.writeFileSync(path.join(outDir, name + '.jsx'), jsx, 'utf8');
    done++;
    console.log('ok ' + name + '.jsx (' + jsx.length + ' chars)');
}
console.log('页面合并完成：' + done);