/* 向部署/交付的页面 cpt 修正云平台模板参数：prjId 值补 whjrscbmanage（cloudUrl 留空 → CLOUD_FALLBACK）
 * 用法：node inject_params.js [目标目录]
 */
const fs = require('fs');
const path = require('path');

const PAGES_DIR = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..', 'pages');
const FILES = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.cpt') && !f.endsWith('.bak'));

let touched = 0;
for (const f of FILES) {
  const p = path.join(PAGES_DIR, f);
  let xml = fs.readFileSync(p, 'utf8');
  let changed = false;
  // 1) 补 prjId 默认值（display_writer 底座自带空 prjId 参数）
  const prjRe = /(<Attributes name="prjId"\/>\s*<O>\s*<\/O>)/;
  if (prjRe.test(xml)) {
    xml = xml.replace(prjRe, '<Attributes name="prjId"/>\n<O><![CDATA[whjrscbmanage]]></O>');
    changed = true;
  }
  // 2) 若缺少 fine_username 参数，追加进 ReportParameterAttr
  if (!xml.includes('name="fine_username"')) {
    const re = /(<ReportParameterAttr>\s*<Attributes [^>]*\/>\s*<PWTitle>[\s\S]*?<\/PWTitle>)(\s*<\/ReportParameterAttr>)/;
    const m = xml.match(re);
    if (m) {
      const add = '\n<Parameter>\n<Attributes name="fine_username"/>\n<O></O>\n</Parameter>';
      xml = xml.replace(re, '$1' + add + '$2');
      changed = true;
    } else {
      console.error('SKIP（无 ReportParameterAttr）：' + f);
    }
  }
  if (changed) {
    fs.writeFileSync(p, xml, 'utf8');
    touched++;
  }
}
console.log('模板参数处理完成：' + touched + ' 个');