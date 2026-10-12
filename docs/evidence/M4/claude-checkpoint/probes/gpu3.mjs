import { connect } from './cdp.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const c = await connect();
await c.ev(readFileSync('harness.js', 'utf8') + '; 0');
const r = await c.ev(`(async()=>{const H=await __H; const out={}; const fin=o=>Object.values(o).every(x=>x===null||Number.isFinite(x));
 // A. Default 360/480Hz byte residue
 for (const hz of [360,480]) { const h=H.make({touch:{precision:'byte',transport:0}}); h.hold([[0.4,0.6,0.6,0.6,1]]); h.run(0.5,1/hz); h.hold([]); const n=h.untilNeutral(1/hz,8,0.25); out['byteDefault_'+hz]={t:n.t,minX:n.r.minX,maxX:n.r.maxX,max:n.r.max}; h.field.dispose(); }
 // B. Advection centroid vs analytic constant-acceleration path, both formats, 60 and 144Hz
 for (const p of ['auto','byte']) for (const hz of [60,144]) { const h=H.make({touch:{precision:p,diffusion:0,recovery:3}}); h.hold([[0.5,0.8,0.5,0.8,1]]); h.field.update(1/hz); h.hold([]);
   const v0=h.field.inspect().centroidV, rows=[]; for (const T of [0.25,0.5]) { h.run(0.25,1/hz); const tau=0.7*T, d0=(1-v0)*6, s=Math.sqrt(0.49+2*2.4*d0); rows.push({T,centroidV:+h.field.inspect().centroidV.toFixed(4),analytic:+(1-(d0+s*tau+1.2*tau*tau)/6).toFixed(4)}); }
   out['advect_'+p+'_'+hz]={v0:+v0.toFixed(4),rows}; h.field.dispose(); }
 // C. Bottom exit / edges: no wrap ghosts
 for (const p of ['auto','byte']) { const h=H.make({touch:{precision:p,recovery:3}}); h.hold([[0.5,0.03,0.5,0.03,1]]); h.field.update(1/60); h.hold([]); h.run(0.3,1/60); const bottom=h.field.inspect();
   const e=H.make({touch:{precision:p,transport:0,recovery:3}}); e.hold([[0.005,0.5,0.005,0.5,1]]); e.run(0.5,1/60); const edgeHeld=e.field.inspect(); e.hold([]); e.run(0.5,1/60); const edge=e.field.inspect();
   out['edges_'+p]={bottomAfter0p3:{sum:bottom.sum,max:bottom.max,cV:bottom.centroidV},edgeHeldCentroidU:edgeHeld.centroidU,edgeAfterCentroidU:edge.centroidU,edgeMinX:edge.minX,edgeMaxX:edge.maxX}; h.field.dispose(); e.field.dispose(); }
 // D. Extrema: 10 overlapping max pointers, radius max/min, sizes min/max, huge delta substeps
 for (const p of ['auto','byte']) for (const [w,hh,rad] of [[64,128,0.06],[512,1024,0.3],[256,512,0.3]]) { const h=H.make({touch:{precision:p,width:w,height:hh,radius:rad,maxStrength:1}});
   h.hold(Array.from({length:10},(_, i)=>[0.45+i*0.01,0.5,0.55-i*0.01,0.52,1])); h.field.update(0.05); h.field.update(0); h.run(1,1/60); const a=h.field.inspect(); const snap=h.field.snapshot();
   out['extreme_'+p+'_'+w+'x'+hh+'_r'+rad]={finite:fin(a),max:a.max,minX:a.minX,maxX:a.maxX,distinct:snap.distinctTargets,readId:snap.readId,writeId:snap.writeId,steps:snap.steps,format:snap.format}; h.field.dispose(); }
 // E. Lateral sign: pointer at u=0.5, sample left/right halves via centroid of |x|? use single held point and compare mins
 { const h=H.make({touch:{transport:0}}); h.hold([[0.5,0.5,0.5,0.5,0.85]]); h.run(0.2,1/60); out.lateral=h.field.inspect(); h.field.dispose(); }
 // F. Rebuild/dispose churn: textures stable
 { const h=H.make(); const before=H.renderer.info.memory.textures; for (let i=0;i<6;i++){ h.config.touch.precision=i%2?'auto':'byte'; h.config.touch.width=i%3?256:128; h.field.configure(); } h.field.inspect(); out.churn={before,after:H.renderer.info.memory.textures,format:h.field.snapshot().format,generation:h.field.snapshot().generation}; h.field.dispose(); out.churn.afterDispose=H.renderer.info.memory.textures; }
 return out;})()`);
console.log(JSON.stringify(r, null, 0).replace(/\},"/g, '},\n"'));
writeFileSync('../out/gpu-transport-extrema.json', JSON.stringify(r, null, 2));
c.close();
