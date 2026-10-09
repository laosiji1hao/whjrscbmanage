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

const PAGES = ['business_pool', 'business_list', 'business_form', 'installment_ment',
               'business_look', 'manager_change', 'config'];

const only = process.argv.slice(2);
const outDir = path.join(ROOT, 'pages');
fs.mkdirSync(outDir, { recursive: true });

let done = 0;
for (const name of PAGES) {
    if (only.length && !only.includes(name)) continue;
    const bodyFile = path.join(ROOT, 'pages_src', name + '.part.js');
    if (!fs.existsSync(bodyFile)) { console.error('缺少页面体：' + bodyFile); continue; }
    const body = fs.readFileSync(bodyFile, 'utf8');
    const jsx = PRELUDE + '\n' + body + '\n' + RENDER;
    fs.writeFileSync(path.join(outDir, name + '.jsx'), jsx, 'utf8');
    done++;
    console.log('ok ' + name + '.jsx (' + jsx.length + ' chars)');
}
console.log('页面合并完成：' + done);