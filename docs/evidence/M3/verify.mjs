import { connect, browserSend, sleep } from './cdp.mjs';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
const out='docs/evidence/M3/final'; mkdirSync(out,{recursive:true});
const c=await connect(); await browserSend('Target.activateTarget',{targetId:c.target.id});
await c.send('Page.enable');await c.send('Runtime.enable');await c.send('Log.enable');
const checks={orientations:{},rebuilds:[],contexts:[],hmr:[]};
const snapshot=()=>c.ev('__WALDEN_DEBUG__.snapshot()');
const apply=code=>c.ev(`void (()=>{const d=__WALDEN_DEBUG__,s=d.config;${code};d.apply()})()`);
async function viewport(width,height,dpr=1) { await c.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile:false});await sleep(350); }
async function shot(name) { await sleep(200);writeFileSync(`${out}/${name}.png`,Buffer.from((await c.send('Page.captureScreenshot')).data,'base64')); }
async function clip(name, change='') {
  const b64=await c.ev(`new Promise(resolve=>{const stream=document.querySelector('canvas').captureStream(30),chunks=[];const rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'});rec.ondataavailable=e=>chunks.push(e.data);rec.onstop=()=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(chunks));stream.getTracks().forEach(t=>t.stop())};rec.start();${change ? `setTimeout(()=>{${change}},5050);` : ''}setTimeout(()=>rec.stop(),10200);})`);
  writeFileSync(`${out}/${name}.webm`,Buffer.from(b64,'base64'));
}
await viewport(1440,900);await c.send('Page.navigate',{url:'http://127.0.0.1:5174/'});await sleep(1800);
checks.production={gui:await c.ev("document.querySelectorAll('.lil-root').length"),debug:await c.ev('Boolean(window.__WALDEN_DEBUG__)')};
await c.send('Page.navigate',{url:'http://127.0.0.1:5174/?debug'});await sleep(1800);await c.ev('void __WALDEN_DEBUG__.hidePanel()');
for(const [name,w,h,dpr] of [['portrait',390,844,3],['landscape',844,390,2],['desktop',1440,900,1],['ultrawide',3840,720,1]]) {
  await viewport(w,h,dpr);checks.orientations[name]=await snapshot();await shot(name);
  if(name==='portrait'||name==='landscape')await clip(name);
}
await viewport(1440,900);await apply('s.camera.drift=false;s.water.flowSpeed=0;s.wet.trickleSpeed=0');
await shot('reference');await apply("s.curtain.quality='reduced'");await shot('curtain-reduced');await apply("s.curtain.quality='reference'");
await apply('s.refraction.enabled=false');await shot('refraction-off');
await apply('s.refraction.enabled=true');await shot('refraction-on');
await clip('refraction-toggle', '__WALDEN_DEBUG__.config.refraction.enabled=false;__WALDEN_DEBUG__.apply()');
await apply('s.refraction.enabled=true;s.curtain.visible=false');await shot('wall-msaa4');
await apply('s.refraction.samples=0');await shot('wall-msaa0');await apply('s.refraction.samples=4');
await apply("s.wall.view='wet mask'");await shot('wet-mask');await apply("s.wall.view='rock'");
await shot('wall-auto');await apply("s.refraction.precision='byte'");await shot('wall-byte');
await apply("s.water.view='refraction';s.refraction.strength=0;s.curtain.visible=true");await shot('zero-byte');
await apply("s.refraction.precision='auto';s.curtain.visible=false");await shot('wall-auto-neutral');
await apply('s.curtain.visible=true');await shot('zero-auto');
await apply("s.water.view='water';s.refraction.strength=0.018;s.water.flowSpeed=1;s.wet.trickleSpeed=0.35");
await shot('light-default');await apply('s.light.targetX=1.5;s.light.targetY=3');await shot('light-moved');
await apply('s.light.targetX=0;s.light.targetY=4');
for(let i=0;i<8;i++){await apply(`s.curtain.quality='${i%2?'reference':'reduced'}';s.refraction.wallResolution=${i%2?1:.5};s.refraction.precision='${i%2?'auto':'byte'}'`);await sleep(100);checks.rebuilds.push(await snapshot());}
const before=await snapshot();const other=await browserSend('Target.createTarget',{url:'about:blank'});await browserSend('Target.activateTarget',{targetId:other.targetId});await sleep(500);const hidden=await snapshot();await sleep(800);const hiddenLater=await snapshot();await browserSend('Target.activateTarget',{targetId:c.target.id});await sleep(500);const resumed=await snapshot();await browserSend('Target.closeTarget',{targetId:other.targetId});
checks.visibility={before,hidden,hiddenLater,resumed};
await apply('s.camera.drift=true');await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await sleep(350);const reducedA=await snapshot();await sleep(700);const reducedB=await snapshot();checks.reducedMotion={reducedA,reducedB};await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
const main=readFileSync('src/main.js');
for(let i=0;i<3;i++){writeFileSync('src/main.js',Buffer.concat([main,Buffer.from(`\n// M3 reversible HMR probe ${i}\n`)]));await sleep(1000);checks.hmr.push({snapshot:await snapshot(),canvases:await c.ev("document.querySelectorAll('canvas').length"),guis:await c.ev("document.querySelectorAll('.lil-root').length")});}
writeFileSync('src/main.js',main);await sleep(1000);
const contextStart=c.events.length;
for(let i=0;i<3;i++){await c.ev('__WALDEN_DEBUG__.loseContext()');await sleep(250);const lost=await snapshot();await c.ev('__WALDEN_DEBUG__.restoreContext()');await sleep(900);checks.contexts.push({lost,restored:await snapshot()});}
checks.contextConsole=c.events.slice(contextStart).filter(e=>['Log.entryAdded','Runtime.exceptionThrown'].includes(e.method));
// Keep the pre-existing HMR-after-restore warning separate from normal recovery.
const hmrStart=c.events.length;writeFileSync('src/main.js',Buffer.concat([main,Buffer.from('\n// M3 post-restore HMR probe\n')]));await sleep(1200);writeFileSync('src/main.js',main);await sleep(1200);
checks.postRestoreHmr={snapshot:await snapshot(),console:c.events.slice(hmrStart).filter(e=>['Log.entryAdded','Runtime.exceptionThrown'].includes(e.method))};
checks.console=c.events.filter(e=>['Log.entryAdded','Runtime.exceptionThrown'].includes(e.method));
writeFileSync(`${out}/checks.json`,JSON.stringify(checks,null,2));console.log(JSON.stringify({orientation:checks.orientations,contexts:checks.contexts.map(x=>x.restored.capture),contextWarnings:checks.contextConsole.length,postRestoreWarnings:checks.postRestoreHmr.console.length}));c.close();
