const fs = require('fs');

function a85decBlock(block) {
  let s = block.replace(/^1Z/, '');
  s = s.replace(/\s+/g, '');
  if (s.endsWith('~')) s = s.slice(0, -1);
  const chars = [...s];
  const bytes = [];
  let i = 0;
  const n = chars.length;
  while (i < n) {
    let cnt = Math.min(5, n - i);
    let val = 0;
    let bad = false;
    for (let j = 0; j < 5; j++) {
      const ch = i + j < n ? chars[i + j] : 'u';
      const v = ch.charCodeAt(0) - 33;
      if (v < 0 || v > 84) { bad = true; break; }
      val = val * 85 + v;
    }
    if (bad) { bytes.push(255); break; }
    const out = (cnt === 5) ? 4 : (cnt - 1);
    for (let j = out - 1; j >= 0; j--) bytes.push((val >> (j * 8)) & 0xff);
    i += 5;
  }
  const buf = Buffer.from(bytes);
  const print = buf.toString('utf8').replace(/[\x00-\x1f\x7f]/g, (c) => {
    const mp = { 0x09: "\\t", 0x0a: "\\n", 0x0d: "\\r", 0x00: "\\x00" };
    return mp[c.charCodeAt(0)] || ("\\x" + c.charCodeAt(0).toString(16).padStart(2, "0"));
  });
  return { n: chars.length, hex: buf.toString('hex'), utf8: print };
}

function dictsFrom(file) {
  const cpt = fs.readFileSync(file, 'utf8');
  const out = [];
  const re = /<TableData name="([^"]+)" class="com.fr.data.impl.EmbeddedTableData">[\s\S]*?<RowData ColumnTypes="[^"]*">\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/RowData>/g;
  let m;
  while ((m = re.exec(cpt))) out.push([m[1], m[2]]);
  return out;
}

function show(name, block) {
  const r = a85decBlock(block);
  console.log(`### ${name}  (chars=${r.n})`);
  console.log(`  utf8: ${r.utf8}`);
}

for (const file of [
  'whjrscbmanage/front/my_business_pc_view.cpt',
  'whjrscbmanage/front/my_business_pc_view_manager.cpt',
  'whjrscbmanage/front/my_business_pc_view_export.cpt'
]) {
  console.log("\n========== FILE: " + file.split('/').pop() + " ==========");
  for (const [name, block] of dictsFrom(file)) {
    show(name, block);
  }
}