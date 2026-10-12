import { connect,browserSend,sleep } from '../M3/cdp.mjs';
import { readFile,writeFile } from 'node:fs/promises';
const c=await connect();await c.send('Runtime.enable');await c.send('Page.enable');await c.send('Log.enable');
const out=new URL('./coupled/',import.meta.url),mainUrl=new URL('../../../src/main.js',import.meta.url),main=await readFile(mainUrl);
const result={measuredAt:new Date().toISOString(),rebuilds:[],hmr:[],restores:[]};
const snapshot=()=>c.ev('({scene:__WALDEN_DEBUG__.snapshot(),field:__WALDEN_DEBUG__.inspectTouch(),canvases:document.querySelectorAll("canvas").length,guis:document.querySelectorAll(".lil-root").length})');
const apply=code=>c.ev(`void (()=>{const d=__WALDEN_DEBUG__;${code};d.apply();d.hidePanel()})()`);
const touch=(type,x=720,y=350)=>c.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{id:1,x,y,radiusX:5,radiusY:5,force:1}]});
try {
 await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await c.send('Emulation.setFocusEmulationEnabled',{enabled:true});
 await c.send('Page.navigate',{url:'http://127.0.0.1:5174/?debug'});await browserSend('Target.activateTarget',{targetId:c.target.id});await sleep(1000);
 await c.send('Emulation.setFocusEmulationEnabled',{enabled:true});await c.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:10});
 for(const precision of ['auto','byte'])for(const [width,height] of [[128,256],[512,1024],[256,512]]){
  await apply(`d.config.touch.precision='${precision}';d.config.touch.width=${width};d.config.touch.height=${height}`);await sleep(200);result.rebuilds.push(await snapshot());
 }
 await apply("d.config.touch.precision='auto'");await touch('touchStart');await sleep(300);
 result.beforeHide=await snapshot();if(result.beforeHide.scene.touch.count!==1)throw new Error('Initial touch was not delivered');await c.send('Emulation.setFocusEmulationEnabled',{enabled:false});const other=await browserSend('Target.createTarget',{url:'about:blank'});await browserSend('Target.activateTarget',{targetId:other.targetId});await sleep(400);result.hidden=await snapshot();await sleep(600);result.hiddenLater=await snapshot();
 await browserSend('Target.activateTarget',{targetId:c.target.id});await browserSend('Target.closeTarget',{targetId:other.targetId});await touch('touchEnd');await sleep(1900);result.resumed=await snapshot();
 if(result.hidden.scene.running||result.hidden.scene.touch.count!==0||result.hidden.scene.frames!==result.hiddenLater.scene.frames||result.resumed.field.max!==0)throw new Error('Visibility cleanup failed');
 await c.send('Emulation.setFocusEmulationEnabled',{enabled:true});
 await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await sleep(200);result.reducedA=await snapshot();await sleep(500);result.reducedB=await snapshot();
 if(JSON.stringify(result.reducedA.scene.camera)!==JSON.stringify(result.reducedB.scene.camera))throw new Error('Reduced-motion camera moved');
 await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await c.ev("window.__pointerEvents=[];for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])document.querySelector('canvas').addEventListener(type,e=>__pointerEvents.push({type,id:e.pointerId,x:e.clientX,y:e.clientY}))");
 await touch('touchStart');await sleep(150);
 await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});await sleep(200);await touch('touchMove',195,350);await sleep(200);result.orientation=await snapshot();await touch('touchCancel');await sleep(1900);result.cancelled=await snapshot();
 result.orientationEvents=await c.ev('__pointerEvents');
 if(result.orientation.scene.touch.count!==1||result.cancelled.scene.touch.count!==0||result.cancelled.field.max!==0)throw new Error('Orientation/cancel failed: '+JSON.stringify({orientation:result.orientation.scene.touch,cancelled:result.cancelled.scene.touch,max:result.cancelled.field.max,events:result.orientationEvents}));
 await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await sleep(200);
 for(let i=0;i<3;i++){await writeFile(mainUrl,Buffer.concat([main,Buffer.from(`\n// Reversible M4 HMR probe ${i}\n`)]));await sleep(900);result.hmr.push(await snapshot());}
 await writeFile(mainUrl,main);await sleep(900);
 for(const precision of ['auto','byte']){
  await apply(`d.config.touch.precision='${precision}'`);await touch('touchStart');await sleep(200);
  await c.ev('void (()=>{window.__lose=document.querySelector("canvas").getContext("webgl2").getExtension("WEBGL_lose_context");__lose.loseContext()})()');await sleep(150);await c.ev('void __lose.restoreContext()');await sleep(900);await touch('touchEnd');result.restores.push(await snapshot());
 }
 for(const row of [...result.rebuilds,...result.hmr,...result.restores])if(row.scene.geometries!==4||row.scene.textures!==3||row.scene.programs!==4||row.canvases!==1||row.guis!==1)throw new Error('Resource count changed');
 for(const row of result.restores)if(row.field.max!==0||row.scene.touch.count!==0||!row.scene.running)throw new Error('Restore not neutral');
 result.console=c.events.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Runtime.consoleAPICalled'&&['error','warn','warning'].includes(e.params.type))).map(e=>({method:e.method,args:e.params.args?.map(a=>a.value||a.description),exception:e.params.exceptionDetails?.text}));
 await writeFile(new URL('lifecycle.json',out),JSON.stringify(result,null,2));console.log(JSON.stringify({rebuilds:result.rebuilds.length,hmr:result.hmr.length,restores:result.restores.length,console:result.console}));
}catch(error){result.error=error.message;await writeFile(new URL('lifecycle-incomplete.json',out),JSON.stringify(result,null,2));throw error;}
finally{await writeFile(mainUrl,main);await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}).catch(()=>{});await c.send('Page.navigate',{url:'about:blank'});c.close();}
