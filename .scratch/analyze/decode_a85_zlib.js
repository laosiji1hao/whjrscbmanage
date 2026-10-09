const fs = require('fs');
const zlib = require('zlib');

function a85bytes(s) {
  s = s.replace(/\s+/g, '');
  if (s.endsWith('~')) s = s.slice(0, -1);
  const chars = [...s];
  const bytes = [];
  let i = 0;
  const n = chars.length;
  while (i < n) {
    const cnt = Math.min(5, n - i);
    let val = 0;
    for (let j = 0; j < 5; j++) {
      const ch = i + j < n ? chars[i + j] : 'u';
      val = val * 85 + (ch.charCodeAt(0) - 33);
    }
    const out = cnt === 5 ? 4 : cnt - 1;
    for (let j = out - 1; j >= 0; j--) bytes.push((val >> (j * 8)) & 0xff);
    i += 5;
  }
  return Buffer.from(bytes);
}

function hexEscape(byte) {
  const h = byte.toString(16).padStart(2, '0');
  return '\\x' + h;
}

function show(name, block) {
  const isCZ = block.trim().startsWith('1Z');
  let buf = a85bytes(block.replace(/^1Z/, ''));
  let out = buf;
  let how = 'A85';
  if (isCZ) {
    try { out = zlib.inflateSync(buf); how = 'A85+zlib'; }
    catch (e) {
      try { out = zlib.inflateRawSync(buf); how = 'A85+rawDeflate'; }
      catch (e2) { how = 'A85 (zlib FAILED)'; }
    }
  }
  let print = '';
  for (let i = 0; i < out.length; i++) {
    const b = out[i];
    if (b === 9) print += '|TAB|';
    else if (b === 10) print += '|NL|';
    else if (b >= 32 && b < 127) print += String.fromCharCode(b);
    else if (b >= 0xc2 && b < 0xf5) print += String.fromCharCode(b);
    else print += hexEscape(b);
  }
  console.log('### ' + name + ' [' + how + '] bytes ' + buf.length + '->' + out.length);
  console.log('   ' + print);
}

function dictsFrom(file) {
  const cpt = fs.readFileSync(file, 'utf8');
  const out = [];
  const re = /<TableData name="([^"]+)" class="com.fr.data.impl.EmbeddedTableData">[\s\S]*?<RowData ColumnTypes="[^"]*">\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/RowData>/g;
  let m;
  while ((m = re.exec(cpt))) out.push([m[1], m[2]]);
  return out;
}

for (const file of ['whjrscbmanage/front/my_business_pc_view.cpt', 'whjrscbmanage/front/my_business_pc_view_manager.cpt', 'whjrscbmanage/front/my_business_pc_view_export.cpt']) {
  console.log('\n========== ' + file.split('/').pop() + ' ==========');
  for (const [name, block] of dictsFrom(file)) show(name, block);
}