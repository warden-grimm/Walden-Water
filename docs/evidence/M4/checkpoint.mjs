// Browser evidence: dedicated Edge :9333, builder preview :5174. No source edits.
import { connect, browserSend, sleep } from '../M3/cdp.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const out = new URL('./checkpoint/', import.meta.url); await mkdir(out, { recursive: true });
const c = await connect();
await c.send('Runtime.enable'); await c.send('Log.enable'); await c.send('Page.enable'); c.events.length = 0;
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'http://127.0.0.1:5174/?debug' });
await browserSend('Target.activateTarget', { targetId: c.target.id }); await sleep(1500);
await c.ev('void (()=>{const d=__WALDEN_DEBUG__;d.config.touch.overlay=true;d.config.camera.drift=false;d.apply();d.hidePanel()})()');
const data = { measuredAt: new Date().toISOString(), baseline: await c.ev('__WALDEN_DEBUG__.snapshot()'), modes: {} };
const inspect = () => c.ev('({field:__WALDEN_DEBUG__.inspectTouch(),snapshot:__WALDEN_DEBUG__.snapshot()})');
async function shot(name) { await writeFile(new URL(name+'.png',out), Buffer.from((await c.send('Page.captureScreenshot')).data,'base64')); }
const mouse = (type,x=720,y=310,buttons=1) => c.send('Input.dispatchMouseEvent',{type,x,y,button:buttons?'left':'none',buttons,clickCount:type==='mousePressed'?1:0});
for (const mode of ['auto','byte']) {
  await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;d.config.touch.precision='${mode}';d.apply();d.resetTouch()})()`); await sleep(150);
  const result = { neutral: await inspect() };
  await c.ev(`void (()=>{window.__chunks=[];const stream=document.querySelector('canvas').captureStream(30);window.__rec=new MediaRecorder(stream,{mimeType:'video/webm'});__rec.ondataavailable=e=>__chunks.push(e.data);__rec.start()})()`);
  await mouse('mousePressed'); await sleep(300); result.contact=await inspect(); await shot(mode+'-contact');
  await sleep(3000); result.held=await inspect(); await shot(mode+'-held');
  await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:720,y:310,button:'left',buttons:0});
  await sleep(200); result.release200=await inspect(); await shot(mode+'-release200');
  await sleep(500); result.release700=await inspect(); await shot(mode+'-release700');
  await sleep(900); result.release1600=await inspect(); await shot(mode+'-release1600');
  await sleep(300); result.release1900=await inspect();
  await mouse('mousePressed',650,450); for(let i=0;i<15;i++){await mouse('mouseMoved',650+i*10,450-i*4);await sleep(16);}
  await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:790,y:394,button:'left',buttons:0});
  result.swipe=await inspect(); await shot(mode+'-swipe'); await sleep(2200);
  await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:660,y:320},{id:2,x:780,y:450}]});
  await sleep(500); result.two=await inspect(); await shot(mode+'-two');
  await c.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]}); await sleep(2200); result.cancel=await inspect();
  const clip = await c.ev(`new Promise(resolve=>{__rec.onstop=()=>{__rec.stream.getTracks().forEach(t=>t.stop());const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(__chunks,{type:'video/webm'}));};__rec.stop();})`);
  await writeFile(new URL(mode+'.webm',out),Buffer.from(clip,'base64'));
  data.modes[mode]=result;
}
data.console = c.events.filter(e => e.method==='Runtime.exceptionThrown'||(e.method==='Runtime.consoleAPICalled'&&['error','warning','warn','info'].includes(e.params.type))||e.method==='Log.entryAdded').map(e=>({method:e.method,type:e.params.type,entry:e.params.entry,description:e.params.exceptionDetails?.text,args:e.params.args?.map(a=>a.value||a.description)}));
await writeFile(new URL('checks.json',out),JSON.stringify(data,null,2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(data.modes).map(([k,r])=>[k,Object.fromEntries(Object.entries(r).map(([name,val])=>[name,{...val.field,pointers:val.snapshot.touch.count,format:val.snapshot.touch.format}]))])),null,2));
c.close();
