// M8 copy of the M7 matched-run script (idle/interaction/stress unchanged), plus a 'postoff'
// modifier (post-processing disabled); 'pooloff'/'shaftoff' from M7/M6. From M5:
// four-finger fast-swipe "stress" mode (fingers sweep partly off the curtain, so it
// checks 4 held pointers, not 4 contacts). No screenshots/readbacks/recording while sampling.
import { connect, browserSend, sleep } from '../M3/cdp.mjs';
import { writeFile } from 'node:fs/promises';
const [label, base='http://127.0.0.1:5174/', mode='idle'] = process.argv.slice(2);
if (!label) throw new Error('Provide a unique evidence label');
// A fresh target avoids Chromium retaining stale touch routing across CDP sessions.
const fresh=await browserSend('Target.createTarget',{url:'about:blank'});
const c = await connect(fresh.targetId);
await c.send('Page.enable'); await c.send('Runtime.enable');
await c.send('Emulation.setFocusEmulationEnabled',{enabled:true});
await c.send('Emulation.setDeviceMetricsOverride', {width:1440,height:900,deviceScaleFactor:1,mobile:false});
await c.send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
await c.send('Page.navigate', {url:base+'?debug'});
await browserSend('Target.activateTarget', {targetId:c.target.id});
await sleep(2000);
await c.send('Emulation.setFocusEmulationEnabled',{enabled:true});
await c.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:10});
const initial=await c.ev('__WALDEN_DEBUG__.snapshot()');
if(initial.viewport.width!==1440||initial.viewport.height!==900||initial.dpr!==1)throw new Error('Unmatched viewport before measurement');
if (mode.includes('postoff')) await c.ev("void (()=>{__WALDEN_DEBUG__.config.post.enabled=false;__WALDEN_DEBUG__.apply()})()");
if (mode.includes('pooloff')) await c.ev("void (()=>{__WALDEN_DEBUG__.config.pool.enabled=false;__WALDEN_DEBUG__.config.mist.enabled=false;__WALDEN_DEBUG__.apply()})()");
if (mode.includes('shaftoff')) await c.ev("void (()=>{__WALDEN_DEBUG__.config.shaft.enabled=false;__WALDEN_DEBUG__.apply()})()");
if (mode.includes('byte')) await c.ev("void (()=>{__WALDEN_DEBUG__.config.touch.precision='byte';__WALDEN_DEBUG__.apply()})()");
await c.ev("window.__resizeTrace=[];window.addEventListener('resize',()=>__resizeTrace.push({time:performance.now(),width:innerWidth,height:innerHeight,dpr:devicePixelRatio}));__WALDEN_DEBUG__.hidePanel();__WALDEN_DEBUG__.sample()");
const interaction=mode.includes('interaction')||mode.includes('stress');
const stress=mode.includes('stress');
const point=(id,x,y)=>({id,x,y,radiusX:5,radiusY:5,force:1});
let deliveredPointerDowns=0;
if(interaction){
  await c.ev("window.__touchDowns=0;document.querySelector('canvas').addEventListener('pointerdown',e=>{if(e.pointerType==='touch')__touchDowns++})");
  await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:stress?[point(1,520,250),point(2,920,350),point(3,560,520),point(4,880,620)]:[point(1,670,330),point(2,770,550)]});
  await sleep(100);deliveredPointerDowns=await c.ev('__touchDowns');
  if(deliveredPointerDowns!==(stress?4:2))throw new Error('Browser did not deliver both touch contacts');
}
const start=performance.now(); let lastPoll=0,status;
do {
  if(interaction){
    const t=(performance.now()-start)/1000;
    // stress: four fingers sweeping ~200 px across the curtain at up to ~1300 px/s.
    await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:stress?[1,2,3,4].map(i=>point(i,720+200*Math.sin(t*6.5+i),150+120*i+30*Math.cos(t*4+i))):[point(1,670+45*Math.sin(t),330+40*Math.sin(t*.7)),point(2,770+40*Math.sin(t*2),550+45*Math.cos(t))]});
    await sleep(16);
  } else await sleep(1000);
  if(performance.now()-lastPoll>=1000){status=await c.ev('__WALDEN_DEBUG__.sampleStatus()');lastPoll=performance.now();}
} while(!status||status.state==='warming'||status.state==='sampling');
const endSnapshot=await c.ev('__WALDEN_DEBUG__.snapshot()');
if(interaction)await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await writeFile(new URL(`./${label}-timing.json`,import.meta.url),JSON.stringify({measuredAt:new Date().toISOString(),base,mode,deliveredPointerDowns,status,endSnapshot,resizeTrace:await c.ev('__resizeTrace')},null,2));
console.log(JSON.stringify({label,state:status.state,count:status.count,median:status.result?.medianMs,p95:status.result?.p95Ms,costs:status.result?.renderCost}));
await c.send('Page.navigate',{url:'about:blank'});c.close();
await browserSend('Target.closeTarget',{targetId:fresh.targetId});
if(status.state!=='complete'||endSnapshot.viewport.width!==1440||endSnapshot.viewport.height!==900||endSnapshot.dpr!==1||(interaction&&endSnapshot.touch&&(stress?endSnapshot.touch.pointers.length!==4:endSnapshot.touch.count!==2)))process.exitCode=1;
