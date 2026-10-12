// App-level proof of preference-preserving failure/retry. Dedicated builder browser only.
import { connect, browserSend, sleep } from '../M3/cdp.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
// Optional new output folder preserves earlier evidence when rechecking a later head.
const out = new URL(process.argv[2] || './retry/',import.meta.url);await mkdir(out,{recursive:true});
const c=await connect();await c.send('Runtime.enable');await c.send('Page.enable');
const hook=await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`{
  window.__badField=true;const read=WebGL2RenderingContext.prototype.readPixels;
  WebGL2RenderingContext.prototype.readPixels=function(...a){read.apply(this,a);if(window.__badField&&a[2]===1&&a[3]===1&&ArrayBuffer.isView(a[6]))a[6].fill(0);};
}`});
const snapshot=()=>c.ev('({snapshot:__WALDEN_DEBUG__.snapshot(),enabled:__WALDEN_DEBUG__.config.touch.enabled,overlay:__WALDEN_DEBUG__.config.touch.overlay,field:__WALDEN_DEBUG__.inspectTouch(),noticeHidden:document.querySelector("#scene-error").hidden})');
const press=()=>c.send('Input.dispatchMouseEvent',{type:'mousePressed',x:700,y:350,button:'left',buttons:1,clickCount:1});
const release=()=>c.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:700,y:350,button:'left',buttons:0});
async function cycle(){await c.ev('void (()=>{window.__lose=document.querySelector("canvas").getContext("webgl2").getExtension("WEBGL_lose_context");__lose.loseContext()})()');await sleep(100);await c.ev('void __lose.restoreContext()');await sleep(600);}
const result={measuredAt:new Date().toISOString()};
try{
  await c.send('Page.navigate',{url:'http://127.0.0.1:5174/?debug'});await browserSend('Target.activateTarget',{targetId:c.target.id});await sleep(1000);
  await c.ev('void (()=>{const d=__WALDEN_DEBUG__;d.config.touch.overlay=true;d.apply();d.hidePanel()})()');
  await press();await sleep(100);result.failed=await snapshot();await release();
  await writeFile(new URL('unavailable-overlay.png',out),Buffer.from((await c.send('Page.captureScreenshot')).data,'base64'));
  await c.ev('void (()=>{__badField=false;__WALDEN_DEBUG__.config.touch.width=192;__WALDEN_DEBUG__.apply()})()');
  await press();await sleep(100);result.sizeRetry=await snapshot();await release();
  await c.ev('void (__badField=true)');await cycle();result.failedRestore=await snapshot();
  await c.ev('void (__badField=false)');await cycle();await press();await sleep(100);result.healthyRestore=await snapshot();await release();
  await c.ev('void (()=>{__WALDEN_DEBUG__.config.touch.enabled=false;__WALDEN_DEBUG__.apply();__badField=true})()');await cycle();
  await c.ev('void (__badField=false)');await cycle();await press();await sleep(100);result.userDisabled=await snapshot();await release();
  if(!result.failed.enabled||!result.failed.overlay||result.failed.snapshot.touch.count!==0||!result.failed.noticeHidden)throw new Error('Unavailable input overwrote preferences or broke rendering');
  for(const r of [result.sizeRetry,result.healthyRestore])if(!r.enabled||!r.overlay||r.snapshot.touch.count!==1||r.field.max<0.8||!r.noticeHidden)throw new Error('Retry did not restore requested interaction');
  if(result.userDisabled.enabled||result.userDisabled.snapshot.touch.count!==0)throw new Error('Retry overwrote intentional disable');
  result.console=c.events.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Runtime.consoleAPICalled'&&['error','warning','warn'].includes(e.params.type))).map(e=>({method:e.method,args:e.params.args?.map(a=>a.value||a.description),exception:e.params.exceptionDetails?.text}));
  await writeFile(new URL('results.json',out),JSON.stringify(result,null,2));
  console.log(JSON.stringify(Object.fromEntries(Object.entries(result).filter(([,r])=>r?.snapshot).map(([name,r])=>[name,{enabled:r.enabled,overlay:r.overlay,available:r.snapshot.touch.available,count:r.snapshot.touch.count,pressure:r.field.max,frames:r.snapshot.frames}]))));
}finally{await c.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:hook.identifier});await c.send('Page.navigate',{url:'http://127.0.0.1:5174/?debug'});c.close();}
