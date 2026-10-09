const fs = require('fs');
const zlib = require('zlib');

const cpt = fs.readFileSync('whjrscbmanage/front/my_business_pc_view.cpt','utf8');
const m = cpt.match(/<TableData name="业务状态"[\s\S]*?<RowData ColumnTypes="java.lang.String,java.lang.String">\s*<!\[CDATA\[([\s\S]*?)\]\]>/);
if(!m){ console.log("not found"); process.exit(0);}
let data = m[1];
console.log("CDATA raw repr:", JSON.stringify(data.split("\n").join("\n")));
const lines = data.replace(/\]\]>.*/s,'').split("\n").filter(l=>l.trim().length);
console.log("lines:", lines.length, lines.map(l=>l.length + ":" + JSON.stringify(l)));

// try decode per line
function tryAlph(line){
  const chars = [...line];
  console.log("  line chars:", chars.map(c=>c.charCodeAt(0)+":"+c).join(" "));
}
lines.forEach(l=>tryAlph(l));
