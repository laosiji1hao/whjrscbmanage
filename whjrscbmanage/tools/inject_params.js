/* 向部署/交付的页面 cpt 修正云平台模板参数：补 cloudUrl/prjId 空声明，prjId 值补 whjrscbmanage（cloudUrl 留空 → CLOUD_FALLBACK）
 * 用法：node inject_params.js [目标目录] [--decl-only]
 *   --decl-only：只补空声明，不写本机 prjId 值 / fine_username —— 给仓库交付产物用，
 *                与既有 pages/*.cpt 的约定一致（云平台部署时由平台把值注进去）
 */
const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);
const DECL_ONLY = ARGS.includes('--decl-only');
const DIR_ARG = ARGS.filter(a => !a.startsWith('--'))[0];
const PAGES_DIR = DIR_ARG ? path.resolve(DIR_ARG) : path.join(__dirname, '..', 'pages');
const FILES = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.cpt') && !f.endsWith('.bak'));

let touched = 0;
for (const f of FILES) {
  const p = path.join(PAGES_DIR, f);
  let xml = fs.readFileSync(p, 'utf8');
  let changed = false;
  // 1) 补底座缺失的云平台模板参数声明：插件骨架 base_cpt_page.cpt 全历史都没有这两项，
  //    而 origin/ 手工原版 cpt 声明了它们（云平台部署时靠它注入 cloudUrl）→ 缺了就补空声明
  if (!xml.includes('name="cloudUrl"') || !xml.includes('name="prjId"')) {
    const i = xml.lastIndexOf('</ReportParameterAttr>');
    if (i > 0) {
      const NLc = xml.includes('\r\n') ? '\r\n' : '\n';
      const decl = NLc + '<Parameter>' + NLc + '<Attributes name="cloudUrl"/>' + NLc + '<O>' + NLc + '</O>' + NLc + '</Parameter>' +
                   NLc + '<Parameter>' + NLc + '<Attributes name="prjId"/>' + NLc + '<O>' + NLc + '</O>' + NLc + '</Parameter>';
      xml = xml.slice(0, i).replace(/\s+$/, '') + decl + NLc + xml.slice(i);
      changed = true;
    }
  }
  // 2)+3) 只有部署目录才写值：仓库交付产物只保留空声明（第 1 步），由云平台部署时注入
  if (!DECL_ONLY) {
    // 2) 补 prjId 默认值（空声明由上面第 1 步保证存在）
    const prjRe = /(<Attributes name="prjId"\/>\s*<O>\s*<\/O>)/;
    if (prjRe.test(xml)) {
      xml = xml.replace(prjRe, '<Attributes name="prjId"/>\n<O><![CDATA[whjrscbmanage]]></O>');
      changed = true;
    }
    // 3) 若缺少 fine_username 参数，追加进 ReportParameterAttr
    if (!xml.includes('name="fine_username"')) {
      const re = /(<ReportParameterAttr>\s*<Attributes [^>]*\/>\s*<PWTitle>[\s\S]*?<\/PWTitle>)(\s*<\/ReportParameterAttr>)/;
      const m = xml.match(re);
      if (m) {
        const add = '\n<Parameter>\n<Attributes name="fine_username"/>\n<O></O>\n</Parameter>';
        xml = xml.replace(re, '$1' + add + '$2');
        changed = true;
      } else {
        // 这两项是帆软内置参数（填报预览自带 fine_username），没匹配到插入点就不补，属正常
        console.error('跳过 fine_username（未匹配到插入点，帆软内置参数）：' + f);
      }
    }
  }
  if (changed) {
    fs.writeFileSync(p, xml, 'utf8');
    touched++;
  }
}
console.log('模板参数处理完成：' + touched + ' 个');