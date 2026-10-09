const fs = require('fs');

function a85dec(line, prefix) {
  let s = line.trim();
  if (s.startsWith("1Z")) s = s.slice(2);
  s = s.replace(/\s/g, "");
  if (s.endsWith("~")) s = s.slice(0, -1);
  if (s.startsWith("<~")) s = s.slice(2);
  if (s.endsWith("~>")) s = s.slice(0, -2);
  const bytes = [];
  let i = 0;
  const n = s.length;
  while (i < n) {
    let cnt = Math.min(5, n - i);
    let val = 0;
    let bad = false;
    for (let j = 0; j < 5; j++) {
      const ch = i + j < n ? s[i + j] : 'u';
      const v = ch.charCodeAt(0) - 33;
      if (v < 0 || v > 84) { bad = true; break; }
      val = val * 85 + v;
    }
    if (bad) { bytes.push(Number.NaN); break; }
    let out = cnt - 1;
    if (i + 5 >= n && n - i < 5) out = n - i - 1;
    for (let j = out - 1; j >= 0; j--) { bytes.push((val >> (j * 8)) & 0xff); }
    i += 5;
  }
  const buf = Buffer.from(bytes);
  const print = buf.toString('utf8').replace(/[\x00-\x1f\x7f]/g, (c) => "\\x" + c.charCodeAt(0).toString(16).padStart(2, "0"));
  return { line: s, utf8: print, hex: buf.toString('hex') };
}

const cpt = fs.readFileSync('whjrscbmanage/front/my_business_pc_view_export.cpt', 'utf8');
const re = /<TableData name="([^"]+)" class="com.fr.data.impl.EmbeddedTableData">[\s\S]*?<RowData ColumnTypes="[^"]*">\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/RowData>/g;
let m;
while ((m = re.exec(cpt))) {
  const name = m[1];
  if (name === "业务状态") continue;
  const lines = m[2].split("\n").filter((l) => l.trim().length);
  console.log("### " + name);
  lines.forEach((l, ix) => {
    const r = a85dec(l);
    console.log(`  row${ix} [${r.line.length}] hex=${r.hex} utf8=${r.utf8}`);
  });
}

console.log("### 业务状态 (view)");
const vc = fs.readFileSync('whjrscbmanage/front/my_business_pc_view.cpt', 'utf8');
const vre = /<TableData name="业务状态"[\s\S]*?<RowData ColumnTypes="[^"]*">\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/RowData>/;
const vm = vre.exec(vc);
const vlines = vm[1].split("\n").filter((l) => l.trim().length);
vlines.forEach((l, ix) => {
  const r = a85dec(l);
  console.log(`  row${ix} [${r.line.length}] hex=${r.hex} utf8=${r.utf8}`);
});

console.log("### 业务状态 (manager)");
const mc = fs.readFileSync('whjrscbmanage/front/my_business_pc_view_manager.cpt', 'utf8');
const mre = /<TableData name="业务状态"[\s\S]*?<RowData ColumnTypes="[^"]*">\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/RowData>/;
const mm = mre.exec(mc);
const mlines = mm[1].split("\n").filter((l) => l.trim().length);
mlines.forEach((l, ix) => {
  const r = a85dec(l);
  console.log(`  row${ix} [${r.line.length}] hex=${r.hex} utf8=${r.utf8}`);
});