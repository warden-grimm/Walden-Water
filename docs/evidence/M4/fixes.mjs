// Focused checkpoint-fix proof. Builder Edge :9333 and preview :5174 only.
import { connect, browserSend, sleep } from '../M3/cdp.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const out = new URL('./fixes/', import.meta.url); await mkdir(out, { recursive: true });
const c = await connect(); await c.send('Runtime.enable'); await c.send('Log.enable'); await c.send('Page.enable');
await c.send('Page.navigate', { url: 'http://127.0.0.1:5174/?debug' });
await browserSend('Target.activateTarget', { targetId: c.target.id }); await sleep(1500);
const result = { measuredAt: new Date().toISOString(), initial: await c.ev('__WALDEN_DEBUG__.snapshot()') };
// Isolated renderer: real shaders/codec, deterministic simulation intervals.
result.decay = await c.ev(String.raw`(async()=>{
  const source = await (await fetch('/src/interaction/TouchField.js')).text();
  const threeUrl = source.match(/from\s+["']([^"']*three[^"']*)["']/)[1];
  const T = await import(threeUrl);
  const {createTouchField}=await import('/src/interaction/TouchField.js');
  const {config:base}=await import('/src/config.js');
  const renderer=new T.WebGLRenderer({canvas:document.createElement('canvas')});
  const rows=[];
  for(const precision of ['auto','byte']) for(const [hz,recovery,threshold] of [[60,1.6,.001],[480,1.6,.001],[165,3,.001],[240,3,.001],[144,3,.0005]]){
    const config=structuredClone(base);Object.assign(config.touch,{precision,recovery,neutralThreshold:threshold,transport:0,diffusion:0});
    const pointers={count:{value:1},segments:Array.from({length:10},()=>new T.Vector4()),strengths:new Float32Array(10),clear(){this.count.value=0;}};
    pointers.segments[0].set(.4,.6,.6,.6);pointers.strengths[0]=1;
    const field=createTouchField(renderer,config,pointers);field.configure();field.update(1/hz);pointers.count.value=0;
    let reading, elapsed=0;
    while(elapsed<4){const frames=Math.round(hz*.25);for(let i=0;i<frames;i++)field.update(1/hz);elapsed+=frames/hz;reading=field.inspect();if(reading.max===0&&reading.minX===0&&reading.maxX===0)break;}
    rows.push({precision,hz,recovery,threshold,elapsed,...reading});field.dispose();
  }
  renderer.dispose();return rows;
})()`);
if (result.decay.some(r => r.max !== 0 || r.minX !== 0 || r.maxX !== 0)) throw new Error('Quantized field residue remains');
const hook = await c.send('Page.addScriptToEvaluateOnNewDocument', { source: `{
  const original=WebGL2RenderingContext.prototype.readPixels;
  WebGL2RenderingContext.prototype.readPixels=function(...args){original.apply(this,args);if(args[2]===1&&args[3]===1&&ArrayBuffer.isView(args[6]))args[6].fill(0);};
}` });
try {
  c.events.length = 0;
  await c.send('Page.navigate', {url:'http://127.0.0.1:5174/?debug'}); await sleep(1300);
  result.unusable = await c.ev('({snapshot:__WALDEN_DEBUG__.snapshot(),neutral:__WALDEN_DEBUG__.inspectTouch(),noticeHidden:document.querySelector("#scene-error").hidden})');
  await c.ev('void (()=>{window.__lose=document.querySelector("canvas").getContext("webgl2").getExtension("WEBGL_lose_context");__lose.loseContext()})()'); await sleep(150);
  await c.ev('void __lose.restoreContext()'); await sleep(1300);
  result.failedRestore = await c.ev('({snapshot:__WALDEN_DEBUG__.snapshot(),noticeHidden:document.querySelector("#scene-error").hidden})');
  await c.send('Page.captureScreenshot').then(r=>writeFile(new URL('unusable-field.png',out),Buffer.from(r.data,'base64')));
  if (!result.unusable.noticeHidden || !result.failedRestore.noticeHidden || result.unusable.snapshot.touch.available || !result.failedRestore.snapshot.running) throw new Error('Field failure stopped the scene');
  result.console = c.events.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Runtime.consoleAPICalled'&&['warn','warning','error'].includes(e.params.type))).map(e=>({method:e.method,type:e.params.type,args:e.params.args?.map(a=>a.value||a.description),exception:e.params.exceptionDetails?.text}));
} finally { await c.send('Page.removeScriptToEvaluateOnNewDocument', {identifier:hook.identifier}); }
await c.send('Page.navigate',{url:'http://127.0.0.1:5174/?debug'});await sleep(1000);
result.recovered = await c.ev('__WALDEN_DEBUG__.snapshot()');
await writeFile(new URL('results.json',out),JSON.stringify(result,null,2));
console.log(JSON.stringify({decay:result.decay.map(r=>({precision:r.precision,hz:r.hz,recovery:r.recovery,neutralAt:r.elapsed})),unusable:result.unusable.snapshot.touch,failedRestore:result.failedRestore.snapshot.touch,recovered:result.recovered.touch,console:result.console},null,2));
c.close();
