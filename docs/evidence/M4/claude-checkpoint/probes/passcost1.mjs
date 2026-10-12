import { connect, sleep } from './cdp.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const c = await connect(); await c.send('Runtime.enable');
await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/' }); await sleep(1500);
await c.ev(readFileSync('harness.js', 'utf8') + '; 0');
const r = await c.ev(`(async()=>{const H=await __H; const gl=H.gl; const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'); const out={};
 for (const p of ['auto','byte']) { const h=H.make({touch:{precision:p}}); h.hold([[0.5,0.5,0.5,0.5,0.85]]); const ms=[];
  for (let f=0; f<240; f++) { await new Promise(r=>requestAnimationFrame(r)); const q=gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT,q); h.field.update(1/60); gl.endQuery(ext.TIME_ELAPSED_EXT); gl.flush();
    (async()=>{ while(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)) await new Promise(r=>setTimeout(r,2)); if(!gl.getParameter(ext.GPU_DISJOINT_EXT)) ms.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6); gl.deleteQuery(q); })(); }
  await new Promise(r=>setTimeout(r,500)); ms.sort((a,b)=>a-b); out[p]={n:ms.length,median:+ms[ms.length>>1].toFixed(4),p95:+ms[Math.floor(ms.length*0.95)].toFixed(4)}; h.field.dispose(); }
 return out;})()`);
console.log(JSON.stringify(r)); writeFileSync('../out/field-pass-gpu-single.json', JSON.stringify(r, null, 2)); c.close();
