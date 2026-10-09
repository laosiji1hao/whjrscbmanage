const zlib = require('zlib');

const data = "1Z3X=B@YIR4\qu`E#E[[S$q;?U3TPd/UY!7a-.NZ\Vs?QShA^k@`qY%A'X79k!,?h!E*=Bq/\nlM2(]A2sZc']A(B~";
console.log("raw:", JSON.stringify(data));
const body = data.slice(2);
console.log("body head:", JSON.stringify(body.slice(0,40)));
const buf = Buffer.from(body, 'base64');
console.log("b64 len:", buf.length, "head hex:", buf.slice(0,16).toString('hex'));
try {
  const out = zlib.inflateSync(buf);
  console.log("inflate:", JSON.stringify(out.toString('utf8')));
} catch(e) {
  console.log("inflate err:", e.message);
  try {
    const out = zlib.inflateSync(buf, {windowBits: -15});
    console.log("inflate raw deflate:", JSON.stringify(out.toString('utf8')));
  } catch(e2) { console.log("raw deflate err:", e2.message); }
  try {
    const out = zlib.gunzipSync(buf);
    console.log("gunzip:", JSON.stringify(out.toString('utf8')));
  } catch(e3) { console.log("gunzip err:", e3.message); }
}
