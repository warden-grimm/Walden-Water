import { connect, sleep } from './cdp.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const c = await connect(); await c.send('Runtime.enable');
await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/' }); await sleep(1500);
await c.ev(readFileSync('harness.js', 'utf8') + '; 0');
const r = await c.ev(`(async()=>{const H=await __H; const gl=H.gl; const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'); const out={};
 async function time(h, n){ const q=gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT,q); for(let i=0;i<n;i++) h.field.update(1/60); gl.endQuery(ext.TIME_ELAPSED_EXT);
   while(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)) await new Promise(r=>setTimeout(r,5)); const ns=gl.getQueryParameter(q,gl.QUERY_RESULT); gl.deleteQuery(q); return +(ns/1e6/n).toFixed(4); }
 for (const p of ['auto','byte']) for (const [w,hh] of [[256,512],[128,256],[512,1024]]) for (const k of [0,1,10]) {
   const h=H.make({touch:{precision:p,width:w,height:hh}}); h.hold(Array.from({length:k},(_, i)=>[0.3+i*0.04,0.5,0.3+i*0.04,0.5,0.85]));
   await time(h,20); const ms=[]; for(let j=0;j<5;j++) ms.push(await time(h,50)); ms.sort((a,b)=>a-b); out[p+'_'+w+'x'+hh+'_ptr'+k]=ms[2]; h.field.dispose(); }
 return out;})()`);
console.log(JSON.stringify(r, null, 0).replace(/,"/g, ',\n"'));
writeFileSync('../out/field-pass-gpu.json', JSON.stringify(r, null, 2)); c.close();
