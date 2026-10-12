// Glint localisation under default vs moved light: diff glint on/off in each.
import { writeFileSync } from 'node:fs';
import { decode, diff } from './png.mjs';
const OUT=process.argv[2];const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const list=await (await fetch('http://127.0.0.1:9334/json/list')).json();
const t=list.find(x=>x.type==='page'&&x.url.includes('5175'));
const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pend=new Map();ws.addEventListener('message',m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){pend.get(d.id)(d.result);pend.delete(d.id);}});
const send=(method,params={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.value;
const apply=code=>ev(`void (()=>{const d=__WALDEN_DEBUG__,s=d.config;${code};d.apply()})()`);
const shot=async name=>{await sleep(300);const b=Buffer.from((await send('Page.captureScreenshot')).data,'base64');writeFileSync(`${OUT}/${name}.png`,b);return decode(b);};
const R={hidden:await ev('document.hidden')};
await apply('s.camera.drift=false;s.water.flowSpeed=0;s.wet.trickleSpeed=0');
for(const [name,x,y] of [['default',0,4],['moved',1.5,3],['low',0,2]]){
  await apply(`s.light.targetX=${x};s.light.targetY=${y};s.water.glint=3`);const on=await shot(`glint-${name}-on`);
  await apply('s.water.glint=0');const off=await shot(`glint-${name}-off`);R[name]=diff(on,off);
}
await apply('s.light.targetX=0;s.light.targetY=4;s.water.glint=3;s.camera.drift=true;s.water.flowSpeed=1;s.wet.trickleSpeed=0.35');
console.log(JSON.stringify(R));ws.close();
