const fs = require('fs');
const cpt = fs.readFileSync('whjrscbmanage/front/my_business_pc_view_export.cpt','utf8');

// Extract all RowData CDATA blocks
const re = /<RowData ColumnTypes="[^"]*">\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/RowData>/g;
let m, set = new Set(), blocks = [];
while ((m = re.exec(cpt))) {
  blocks.push(m[1]);
  for (const ch of m[1].replace(/[^A-Za-z0-9]/g,'')) set.add(ch);
}
console.log("num blocks:", blocks.length);
const chars = [...set];
console.log("unique alnum chars:", chars.length, chars.join(""));
console.log("sorted:", [...chars].sort().join(""));

// Also count ALL chars (including punctuation) across blocks, excluding whitespace and ~ and 1Z prefix
let all = new Set();
blocks.forEach(b => b.split("\n").forEach(line => {
  let s = line.trim();
  if (s.startsWith("1Z")) s = s.slice(2);
  s = s.replace(/~$/,'');
  for (const ch of s) all.add(ch);
}));
const al = [...all];
console.log("unique body chars (all):", al.length, "->", al.sort().join(""));
// print with codepoints
console.log("codepoints:", al.sort((a,b)=>a.charCodeAt(0)-b.charCodeAt(0)).map(c=>c.charCodeAt(0)+":"+c).join(" "));
