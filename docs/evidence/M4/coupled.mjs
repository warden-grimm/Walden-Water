// Final-water evidence, desktop emulation only. Uses native CDP touch events.
import { connect,browserSend,sleep } from '../M3/cdp.mjs';
import { mkdir,writeFile } from 'node:fs/promises';
import { Vector3 } from 'three';
import { config } from '../../../src/config.js';
import { createCamera } from '../../../src/scene/camera.js';
const out=new URL('./coupled/',import.meta.url);await mkdir(out,{recursive:true});
const c=await connect();await c.send('Runtime.enable');await c.send('Log.enable');await c.send('Page.enable');
await c.send('Page.navigate',{url:'http://127.0.0.1:5174/?debug'});await browserSend('Target.activateTarget',{targetId:c.target.id});await sleep(1200);
const data={measuredAt:new Date().toISOString(),clips:{},alignment:[]};
const snapshot=()=>c.ev('__WALDEN_DEBUG__.snapshot()');
async function project(u,v){const s=await snapshot(),time={value:s.elapsed},view=createCamera(config,time);view.configure(s.viewport.width/s.viewport.height,s.reducedMotion);const p=new Vector3((u-.5)*config.curtain.width,v*config.curtain.height,config.curtain.bow*(1-(2*u-1)**2)*Math.sin(Math.PI*v)).project(view.camera);return {x:(p.x+1)*s.viewport.width/2,y:(1-p.y)*s.viewport.height/2};}
const touch=(type,points)=>c.send('Input.dispatchTouchEvent',{type,touchPoints:points});
const point=(id,p)=>({id,x:p.x,y:p.y,radiusX:5,radiusY:5,force:1});
const shot=async name=>writeFile(new URL(name+'.png',out),Buffer.from((await c.send('Page.captureScreenshot')).data,'base64'));
const apply=async settings=>c.ev(`void (()=>{const d=__WALDEN_DEBUG__;${settings};d.apply();d.hidePanel()})()`);
async function beginClip(){await c.ev('void (()=>{window.__chunks=[];window.__rec=new MediaRecorder(document.querySelector("canvas").captureStream(30),{mimeType:"video/webm"});__rec.ondataavailable=e=>__chunks.push(e.data);__rec.start()})()');}
async function endClip(name){const clip=await c.ev('new Promise(resolve=>{__rec.onstop=()=>{__rec.stream.getTracks().forEach(t=>t.stop());const r=new FileReader();r.onload=()=>resolve(r.result.split(",")[1]);r.readAsDataURL(new Blob(__chunks,{type:"video/webm"}));};__rec.stop();})');await writeFile(new URL(name+'.webm',out),Buffer.from(clip,'base64'));}
for(const [orientation,width,height] of [['portrait',390,844],['landscape',844,390]])for(const precision of ['auto','byte']){
  const label=orientation+'-'+precision;
  await c.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true});await sleep(500);
  await apply(`d.config.touch.precision='${precision}';d.config.touch.overlay=false;d.config.water.view='water';d.resetTouch()`);await sleep(300);
  const record={initial:await snapshot()};await shot(label+'-idle');await beginClip();await sleep(1000);
  let a=point(1,await project(.45,.68)),b=point(2,await project(.68,.42));
  await touch('touchStart',[a]);await sleep(3000);record.held={snapshot:await snapshot(),field:await c.ev('__WALDEN_DEBUG__.inspectTouch()')};await shot(label+'-held');
  await touch('touchStart',[a,b]);await sleep(1000);record.two=await snapshot();await shot(label+'-two');
  const slowEnd=await project(.65,.68),fastEnd=await project(.3,.42),a0={...a},b0={...b};
  for(let i=1;i<=24;i++){a={...a0,x:a0.x+(slowEnd.x-a0.x)*i/24,y:a0.y+(slowEnd.y-a0.y)*i/24};await touch('touchMove',[a,b]);await sleep(40);}
  await sleep(300);
  for(let i=1;i<=10;i++){b={...b0,x:b0.x+(fastEnd.x-b0.x)*i/10,y:b0.y+(fastEnd.y-b0.y)*i/10};await touch('touchMove',[a,b]);await sleep(16);}
  await shot(label+'-swipe');await touch('touchEnd',[b]);await sleep(250);record.one=await snapshot();
  await touch('touchEnd',[]);record.releasedAt=(await snapshot()).elapsed;
  await sleep(700);record.wake={snapshot:await snapshot(),field:await c.ev('__WALDEN_DEBUG__.inspectTouch()')};await shot(label+'-wake');
  await sleep(1600);record.healed={snapshot:await snapshot(),field:await c.ev('__WALDEN_DEBUG__.inspectTouch()')};await shot(label+'-healed');
  await sleep(2200);await endClip(label);data.clips[label]=record;
  if(record.two.touch.count!==2||record.one.touch.count!==1||record.healed.snapshot.touch.count!==0||record.healed.field.max!==0)throw new Error('Touch lifecycle failed: '+label);
  // The diagnostic uses the SAME deformed vertices as production water.
  await apply("d.config.water.view='touch pressure'");
  for(const [u,v] of [[.08,.9],[.92,.9],[.5,.5],[.08,.1],[.92,.1]]){
    await c.ev('void __WALDEN_DEBUG__.resetTouch()');await sleep(80);
    const p=await project(u,v);await touch('touchStart',[point(1,p)]);await sleep(250);
    const name=label+'-align-'+u+'-'+v;await shot(name);
    data.alignment.push({name,u,v,pointer:p,snapshot:await snapshot()});await touch('touchEnd',[]);
  }
}
// Matched deformation quality diagnostic: fixed camera and smooth base normals.
await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await sleep(500);
await apply("d.config.camera.drift=false;d.config.water.normalStrength=0;d.config.water.view='normals';d.config.touch.precision='auto';d.resetTouch()");
await touch('touchStart',[point(1,{x:700,y:350})]);await sleep(3000);await shot('quality-reference');data.reference=await snapshot();
await apply("d.config.curtain.quality='reduced'");await sleep(500);await shot('quality-reduced');data.reduced=await snapshot();await touch('touchEnd',[]);
data.console=c.events.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Runtime.consoleAPICalled'&&['error','warning','warn'].includes(e.params.type))).map(e=>({method:e.method,args:e.params.args?.map(a=>a.value||a.description),exception:e.params.exceptionDetails?.text}));
await writeFile(new URL('checks.json',out),JSON.stringify(data,null,2));
console.log(JSON.stringify({clips:Object.keys(data.clips),alignment:data.alignment.length,console:data.console}));
await c.send('Page.navigate',{url:'http://127.0.0.1:5174/?debug'});c.close();
