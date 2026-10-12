import { connect, browserSend, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const c = await connect();
await browserSend('Target.activateTarget', { targetId: c.target.id });
await c.send('Runtime.enable'); await c.send('Log.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'http://127.0.0.1:5174/?debug' }); await sleep(2500);
await c.ev(`void (() => { const d=__WALDEN_DEBUG__;d.hidePanel();d.config.camera.drift=false;d.config.water.flowSpeed=0;d.config.wet.trickleSpeed=0;d.config.markers.opacity=0;d.apply(); })()`);
async function shot(name, code) {
  if(code) await c.ev(code); await sleep(250);
  writeFileSync(`docs/evidence/M3/checkpoint/${name}.png`, Buffer.from((await c.send('Page.captureScreenshot')).data,'base64'));
}
await shot('wall-only', `__WALDEN_DEBUG__.config.curtain.visible=false;__WALDEN_DEBUG__.apply()`);
await shot('zero-offset', `__WALDEN_DEBUG__.config.curtain.visible=true;__WALDEN_DEBUG__.config.water.view='refraction';__WALDEN_DEBUG__.config.refraction.strength=0;__WALDEN_DEBUG__.apply()`);
await shot('offset', `__WALDEN_DEBUG__.config.refraction.strength=0.06;__WALDEN_DEBUG__.apply()`);
await shot('uv', `__WALDEN_DEBUG__.config.water.view='uv';__WALDEN_DEBUG__.apply()`);
await c.ev(`__WALDEN_DEBUG__.config.water.view='flow bands';__WALDEN_DEBUG__.config.water.flowSpeed=1;__WALDEN_DEBUG__.apply()`);
const clip = await c.ev(`new Promise(resolve=>{const stream=document.querySelector('canvas').captureStream(30);const chunks=[];const rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'});rec.ondataavailable=e=>chunks.push(e.data);rec.onstop=async()=>{const blob=new Blob(chunks);const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);stream.getTracks().forEach(t=>t.stop());};rec.start();setTimeout(()=>rec.stop(),10000);})`);
writeFileSync('docs/evidence/M3/checkpoint/flow.webm',Buffer.from(clip,'base64'));
const gpu = await c.ev(`(${async function () {
  const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/deps/three.js')).name;
  const T=await import(url), {createWallCapture}=await import('/src/scene/WallCapture.js');
  const renderer=new T.WebGLRenderer(); renderer.setSize(128,128); renderer.setPixelRatio(1.5);
  renderer.setViewport(3,4,60,70); renderer.setScissor(5,6,40,50);renderer.setScissorTest(true);renderer.autoClear=false;
  const outer=new T.WebGLRenderTarget(32,32);outer.viewport.set(2,3,24,25);outer.scissor.set(1,2,23,24);outer.scissorTest=true;
  renderer.setRenderTarget(outer);const scene=new T.Scene(),camera=new T.PerspectiveCamera(45,1,.1,10);camera.position.z=2;
  const geometry=new T.PlaneGeometry(),material=new T.MeshBasicMaterial({color:0xabcdef});const wall=new T.Mesh(geometry,material);wall.name='wall';scene.add(wall);
  const capture=createWallCapture(renderer,scene,camera,{scale:1,precision:'auto'});
  const state=()=>({targetIsOuter:renderer.getRenderTarget()===outer,viewport:renderer.getViewport(new T.Vector4()).toArray(),current:renderer.getCurrentViewport(new T.Vector4()).toArray(),scissor:renderer.getScissor(new T.Vector4()).toArray(),scissorTest:renderer.getScissorTest(),autoClear:renderer.autoClear});
  const before=state();capture.resize(64,64);capture.render();const after=state();
  const real=renderer.render;renderer.render=()=>{throw Error('deliberate proof exception');};try{capture.render();}catch{}renderer.render=real;const afterException=state();
  const output={before,after,afterException,identical:JSON.stringify(before)===JSON.stringify(after)&&JSON.stringify(before)===JSON.stringify(afterException),source:capture.snapshot(),glError:renderer.getContext().getError()};
  renderer.setRenderTarget(null);capture.dispose();outer.dispose();geometry.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss();return output;
}})()`);
const result={snapshot:await c.ev('__WALDEN_DEBUG__.snapshot()'),gpuStateProof:gpu,console:c.events.filter(e=>['Runtime.exceptionThrown','Log.entryAdded'].includes(e.method))};
writeFileSync('docs/evidence/M3/checkpoint/checks.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));c.close();
