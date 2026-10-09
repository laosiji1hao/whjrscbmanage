const zlib = require('zlib');

// 业务状态 from view (2 records)
const raw = "3X=B@YIR4\qu`E#E[[S$q;?U3TPd/UY!7a-.NZ\Vs?QShA^k@`qY%A'X79k!,?h!E*=Bq/\nlM2(]A2sZc']A(B~";
const body = raw.replace(/\s+/g, "").split("~").filter(s=>s.length);
console.log("records:", body.length, body.map(b=>b.length));

const alphabets = {
  std:      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
  fr0:      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/",
  aA09:     "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/",
  ascii90:  "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~".slice(0,64),
  frclean:  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz=+",
  frread:   "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz+/",
};

// Try each alphabet: map char->6bit, concat bits, take bytes; try zlib inflate and utf8
for (const [name, alpha] of Object.entries(alphabets)) {
  const idx = new Map([...alpha].map((ch,i)=>[ch,i]));
  for (let recIdx=0; recIdx<body.length; recIdx++){
    const s = body[recIdx];
    if ([...s].some(ch=>!idx.has(ch))) continue;
    let bits = "";
    for (const ch of s) bits += idx.get(ch).toString(2).padStart(6,"0");
    const bytes = [];
    for (let i=0;i+8<=bits.length;i+=8) bytes.push(parseInt(bits.substr(i,8),2));
    const buf = Buffer.from(bytes);
    for (const wb of [15, 31]) {
      try {
        const out = zlib.inflateSync(buf, {windowBits: wb});
        const t = out.toString('utf8');
        console.log(`[${name}] rec${recIdx} wbits${wb} len=${buf.length}->${out.length}: ${JSON.stringify(t.slice(0,80))}`);
      } catch(e){}
      try {
        const out = zlib.inflateRawSync(buf);
        console.log(`[${name}] rec${recIdx} RAW len=${buf.length}->${out.length}: ${JSON.stringify(out.toString('utf8').slice(0,80))}`);
      } catch(e){}
      try {
        const out = zlib.gunzipSync(buf);
        console.log(`[${name}] rec${recIdx} GZIP len=${buf.length}->${out.length}: ${JSON.stringify(out.toString('utf8').slice(0,80))}`);
      } catch(e){}
    }
    // Plain utf8 if printable
    try {
      const t = buf.toString('utf8');
      if (/^[\x20-\x7e\u4e00-\u9fff\u3000-\u303f\s]+$/.test(t)) {
        console.log(`[${name}] rec${recIdx} PLAIN: ${JSON.stringify(t)}`);
      }
    } catch(e){}
  }
}
