import {connect,browserSend,sleep} from '../M3/cdp.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Optional output directory and SHAs keep subsequent releases separate from the original evidence.
const base='https://warden-grimm.github.io/Walden-Water/',out=new URL(process.argv[2]||'./deployment/',import.meta.url);
await mkdir(out,{recursive:true});
const result={measuredAt:new Date().toISOString(),deployment:process.argv[3]||'6c856e5db73cad7d74e90f4959ab87486bb10607',reviewedImplementation:process.argv[4]||'e2a45837b75a1f4c0b135c229dd265a682428867',assets:[],views:[]};
const html=await(await fetch(base,{headers:{'Cache-Control':'no-cache'}})).text();
const localHtml=await readFile(new URL('../../../dist/index.html',import.meta.url),'utf8');
if(html.trim()!==localHtml.trim())throw new Error('Live HTML differs from reviewed local build');
for(const [,path] of html.matchAll(/(?:src|href)="(\.\/assets\/[^\"]+)"/g)){
 const remote=Buffer.from(await(await fetch(new URL(path,base))).arrayBuffer()),local=await readFile(new URL('../../../dist/'+path,import.meta.url));
 const hash=buf=>createHash('sha256').update(buf).digest('hex');
 if(hash(remote)!==hash(local))throw new Error('Live asset differs: '+path);
 result.assets.push({path,bytes:remote.length,sha256:hash(remote)});
}
const fresh=await browserSend('Target.createTarget',{url:'about:blank'}),c=await connect(fresh.targetId);
await c.send('Page.enable');await c.send('Runtime.enable');await c.send('Log.enable');
try{
 await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await c.send('Page.navigate',{url:base});await browserSend('Target.activateTarget',{targetId:c.target.id});await sleep(2000);
 result.normalRoute=await c.ev('({debug:!!window.__WALDEN_DEBUG__,gui:document.querySelectorAll(".lil-root").length,noticeHidden:document.querySelector("#scene-error").hidden})');
 if(result.normalRoute.debug||result.normalRoute.gui||!result.normalRoute.noticeHidden)throw new Error('Normal route failed');
 await c.send('Page.navigate',{url:base+'?debug'});await sleep(1500);
 await c.send('Emulation.setFocusEmulationEnabled',{enabled:true});await c.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:10});
 for(const [width,height,dpr,mode] of [[1440,900,1,'auto'],[390,844,2,'auto'],[844,390,2,'byte']]){
  await c.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile:width<1000});await sleep(300);
  await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;d.config.touch.precision='${mode}';d.apply();d.hidePanel();d.resetTouch()})()`);
  await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:width/2-25,y:height*.4},{id:2,x:width/2+25,y:height*.6}]});await sleep(500);
  const held=await c.ev('({snapshot:__WALDEN_DEBUG__.snapshot(),field:__WALDEN_DEBUG__.inspectTouch()})');
  if(held.snapshot.touch.count!==2||held.field.max<.8||!held.snapshot.effects.includes('water parting'))throw new Error('Live M4 touch failed');
  await writeFile(new URL(`${width}x${height}-${mode}.png`,out),Buffer.from((await c.send('Page.captureScreenshot')).data,'base64'));
  await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(2100);
  const healed=await c.ev('({snapshot:__WALDEN_DEBUG__.snapshot(),field:__WALDEN_DEBUG__.inspectTouch()})');
  if(healed.snapshot.touch.count!==0||healed.field.max!==0)throw new Error('Live M4 recovery failed');
  result.views.push({width,height,dpr,mode,held,healed});
 }
 result.console=c.events.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Runtime.consoleAPICalled'&&['error','warning','warn'].includes(e.params.type))||(e.method==='Log.entryAdded'&&['error','warning'].includes(e.params.entry.level)));
 if(result.console.length)throw new Error('Live browser emitted errors/warnings');
 await writeFile(new URL('smoke.json',out),JSON.stringify(result,null,2));
 console.log(JSON.stringify({assets:result.assets,normalRoute:result.normalRoute,views:result.views.map(v=>({width:v.width,height:v.height,mode:v.mode,count:v.held.snapshot.touch.count,neutral:v.healed.field.max})),console:result.console}));
}finally{await c.send('Page.navigate',{url:'about:blank'});c.close();await browserSend('Target.closeTarget',{targetId:fresh.targetId});}
