import { connect, sleep } from './cdp.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const c = await connect();
await c.ev(readFileSync('harness.js', 'utf8') + '; 0');
const r = await c.ev(`(async()=>{const H=await __H; const out={};
 const fmt = p => ({auto:{precision:'auto'}, byte:{precision:'byte'}})[p];
 // 1. Hold-release recovery vs refresh rate, both formats, default settings
 for (const p of ['auto','byte']) for (const hz of [30,60,120,144,240]) {
   const h=H.make({touch:fmt(p)}); h.hold([[0.5,0.6,0.5,0.6,0.85]]); h.run(3,1/hz); const held=h.field.inspect();
   h.hold([]); const n=h.untilNeutral(1/hz,10,0.02); out['recover_'+p+'_'+hz]={format:h.field.snapshot().format,heldMax:+held.max.toFixed(4),tNeutral:n.t,residualMax:n.r.max,minX:n.r.minX,maxX:n.r.maxX}; h.field.dispose(); }
 // 2. Byte stall at GUI extremes: recovery 3 (max), threshold default and 0.0005 (min)
 for (const p of ['auto','byte']) for (const [hz,rec,th] of [[60,3,0.001],[165,3,0.001],[240,3,0.001],[240,3,0.0005],[144,3,0.0005],[120,1.6,0.0005]]) {
   const h=H.make({touch:{...fmt(p),recovery:rec,neutralThreshold:th}}); h.hold([[0.5,0.6,0.5,0.6,0.85]]); h.run(1,1/hz);
   h.hold([]); const n=h.untilNeutral(1/hz,15,0.25); out['stall_'+p+'_'+hz+'_R'+rec+'_th'+th]={tNeutral:n.t,max:n.r.max,minX:n.r.minX,maxX:n.r.maxX}; h.field.dispose(); }
 return out;})()`);
console.log(JSON.stringify(r, null, 1));
writeFileSync('../out/gpu-recovery.json', JSON.stringify(r, null, 2));
c.close();
