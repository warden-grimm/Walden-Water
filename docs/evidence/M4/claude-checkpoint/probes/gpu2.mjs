import { connect } from './cdp.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const c = await connect();
await c.ev(readFileSync('harness.js', 'utf8') + '; 0');
const r = await c.ev(`(async()=>{const H=await __H; const out={};
 // Decay-only (transport 0): does byte quantization stall above the neutral cutoff?
 for (const p of ['auto','byte']) for (const [hz,rec,th,dif] of [[60,1.6,0.001,3],[60,3,0.001,0],[165,3,0.001,0],[240,1.6,0.001,0],[240,3,0.001,0],[240,3,0.001,3],[144,3,0.0005,0],[240,3,0.0005,3]]) {
   const h=H.make({touch:{precision:p,recovery:rec,neutralThreshold:th,transport:0,diffusion:dif}});
   // swept segment gives nonzero lateral force too
   h.hold([[0.4,0.6,0.6,0.6,1]]); h.run(0.5,1/hz); h.hold([]);
   const n=h.untilNeutral(1/hz,12,0.25); out[p+'_'+hz+'Hz_R'+rec+'_th'+th+'_dif'+dif]={expected:+(rec*Math.log(1/th)/Math.log(1/th)).toFixed(2),tNeutral:n.t,max:n.r.max,minX:n.r.minX,maxX:n.r.maxX,sum:n.r.sum}; h.field.dispose(); }
 return out;})()`);
console.log(JSON.stringify(r, null, 0).replace(/\},/g, '},\n'));
writeFileSync('../out/gpu-decay-stall.json', JSON.stringify(r, null, 2));
c.close();
