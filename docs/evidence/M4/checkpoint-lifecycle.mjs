import { connect, sleep } from '../M3/cdp.mjs';
import { writeFile } from 'node:fs/promises';
const c=await connect();await c.send('Runtime.enable');await c.send('Log.enable');c.events.length=0;
await c.send('Page.navigate',{url:'http://127.0.0.1:5174/?debug'});await sleep(1000);
const snapshot=()=>c.ev('({snapshot:__WALDEN_DEBUG__.snapshot(),field:__WALDEN_DEBUG__.inspectTouch()})');
const data={rebuilds:[],restores:[],recovery:{}};
for(const mode of ['auto','byte']) {
 await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;d.config.camera.drift=false;d.config.touch.precision='${mode}';d.apply();d.hidePanel();d.resetTouch()})()`);await sleep(100);
 for(const [width,height] of [[128,256],[512,1024],[256,512]]) {
  await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;d.config.touch.width=${width};d.config.touch.height=${height};d.apply()})()`);await sleep(150);data.rebuilds.push(await snapshot());
 }
 await c.send('Input.dispatchMouseEvent',{type:'mousePressed',x:720,y:310,button:'left',buttons:1,clickCount:1});await sleep(300);
 await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:720,y:310,button:'left',buttons:0});
 const origin=await c.ev('__WALDEN_DEBUG__.snapshot().elapsed');
 const samples=[];
 for(let i=0;i<23;i++){await sleep(80);const sample=await snapshot();samples.push({elapsed:sample.snapshot.elapsed-origin,...sample.field});}
 data.recovery[mode]=samples;
 await c.ev('void __WALDEN_DEBUG__.loseContext()');await sleep(200);await c.ev('void __WALDEN_DEBUG__.restoreContext()');await sleep(900);data.restores.push(await snapshot());
}
data.console=c.events.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Runtime.consoleAPICalled'&&['error','warn','warning','info'].includes(e.params.type))||e.method==='Log.entryAdded').map(e=>({method:e.method,type:e.params.type,args:e.params.args?.map(a=>a.value||a.description),entry:e.params.entry}));
await writeFile(new URL('./checkpoint/lifecycle.json',import.meta.url),JSON.stringify(data,null,2));
console.log(JSON.stringify({rebuilds:data.rebuilds.map(r=>[r.snapshot.geometries,r.snapshot.textures,r.snapshot.programs,r.snapshot.touch.format]),restores:data.restores.map(r=>({field:r.field,resources:[r.snapshot.geometries,r.snapshot.textures,r.snapshot.programs],restores:r.snapshot.restores})),recovery:Object.fromEntries(Object.entries(data.recovery).map(([k,v])=>[k,{below1percent:v.find(x=>x.max<0.01)?.elapsed,neutral:v.find(x=>x.max===0)?.elapsed}])),console:data.console},null,2));c.close();
