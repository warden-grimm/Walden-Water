// Historical evidence script, not an application dependency. Dedicated Edge :9333.
import { connect, browserSend, sleep } from './cdp.mjs';
import { readFile, writeFile } from 'node:fs/promises';
const c = await connect(), evidence = { captures: {}, context: [], hmr: [] };
const output = new URL('./', import.meta.url);
const ev = c.ev;
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
async function size(width, height, deviceScaleFactor = 1) {
  await c.send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor, mobile:false});
  await sleep(300);
}
async function shot(name) {
  await sleep(300);
  const screenshot = await c.send('Page.captureScreenshot');
  await writeFile(new URL(`${name}.png`, output), Buffer.from(screenshot.data, 'base64'));
  evidence.captures[name] = await ev('__WALDEN_DEBUG__.snapshot()');
}
await c.send('Page.navigate', {url:'http://127.0.0.1:5174/'}); await sleep(1000);
evidence.normalUrl = await ev('({debug: !!window.__WALDEN_DEBUG__, gui:document.querySelectorAll(".lil-gui.lil-root").length})');
await c.send('Page.navigate', {url:'http://127.0.0.1:5174/?debug'}); await sleep(1000);
await browserSend('Target.activateTarget', {targetId:c.target.id});
await ev('void __WALDEN_DEBUG__.hidePanel()');
await size(1440,900); await shot('desktop');
await size(390,844,3); await shot('portrait');
await size(844,390,2); await shot('landscape');
await size(3840,720); await shot('ultrawide');
await size(1440,900);
// Matched geometry comparison: freeze trickle and camera, remove M1 placeholder.
await ev('__WALDEN_DEBUG__.config.camera.drift=false; __WALDEN_DEBUG__.config.wet.trickleSpeed=0; __WALDEN_DEBUG__.config.curtain.opacity=0; __WALDEN_DEBUG__.apply()');
await shot('rock-reference');
await ev('__WALDEN_DEBUG__.config.wall.quality="reduced"; __WALDEN_DEBUG__.apply()'); await shot('rock-reduced');
await ev('__WALDEN_DEBUG__.config.wall.quality="reference"; __WALDEN_DEBUG__.config.wall.view="normals"; __WALDEN_DEBUG__.apply()'); await shot('normals');
await ev('__WALDEN_DEBUG__.config.wall.displacement=false; __WALDEN_DEBUG__.apply()'); await shot('normals-flat');
await ev('__WALDEN_DEBUG__.config.wall.displacement=true; __WALDEN_DEBUG__.config.wall.view="rock"; __WALDEN_DEBUG__.config.wet.sheen=false; __WALDEN_DEBUG__.apply()'); await shot('sheen-off');
await ev('__WALDEN_DEBUG__.config.wet.sheen=true; __WALDEN_DEBUG__.config.wall.view="light mask"; __WALDEN_DEBUG__.apply()'); await shot('light-mask');
await ev('__WALDEN_DEBUG__.config.wall.view="rock"; __WALDEN_DEBUG__.config.wet.trickleSpeed=.35; __WALDEN_DEBUG__.apply()');
const video = await ev(`(async()=>{
  const stream=document.querySelector('canvas').captureStream(30), chunks=[];
  const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'});
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  const stopped=new Promise(resolve=>recorder.onstop=resolve);
  recorder.start(); await new Promise(r=>setTimeout(r,8000)); recorder.stop(); await stopped;
  stream.getTracks().forEach(track=>track.stop());
  const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());
  let binary=''; for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);
  return btoa(binary);
})()`);
await writeFile(new URL('wet-trickle.webm',output),Buffer.from(video,'base64'));
// Restore defaults before lifecycle checks.
await c.send('Page.reload'); await sleep(1000); await ev('void __WALDEN_DEBUG__.hidePanel()');
for(let i=0;i<3;i++) {
  await ev('__WALDEN_DEBUG__.sample(); __WALDEN_DEBUG__.loseContext()'); await sleep(400);
  const lost=await ev('({snapshot:__WALDEN_DEBUG__.snapshot(),sample:__WALDEN_DEBUG__.sampleStatus().state})');
  await ev('__WALDEN_DEBUG__.restoreContext()'); await sleep(800);
  evidence.context.push({lost,restored:await ev('__WALDEN_DEBUG__.snapshot()')});
}
const configUrl=new URL('../../../src/config.js',import.meta.url), original=await readFile(configUrl,'utf8');
try {
  for(let i=0;i<4;i++) {
    await writeFile(configUrl,original+`\n// M2 evidence HMR cycle ${i}\n`); await sleep(900);
    evidence.hmr.push(await ev('({snapshot:__WALDEN_DEBUG__.snapshot(),canvases:document.querySelectorAll("canvas").length,panels:document.querySelectorAll(".lil-gui.lil-root").length})'));
  }
} finally { await writeFile(configUrl,original); await sleep(900); }
await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await sleep(200);
evidence.reducedMotion=await ev('__WALDEN_DEBUG__.snapshot()');
await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
const blank=await browserSend('Target.createTarget',{url:'about:blank',background:false});
await browserSend('Target.activateTarget',{targetId:blank.targetId}); await sleep(400);
const hiddenA=await ev('__WALDEN_DEBUG__.snapshot()'); await sleep(600);
const hiddenB=await ev('__WALDEN_DEBUG__.snapshot()');
await browserSend('Target.activateTarget',{targetId:c.target.id}); await sleep(400);
evidence.visibility={hiddenA,hiddenB,resumed:await ev('__WALDEN_DEBUG__.snapshot()')};
await browserSend('Target.closeTarget',{targetId:blank.targetId});
evidence.gpu=await ev(`(()=>{const gl=document.querySelector('canvas').getContext('webgl2'),x=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:x?gl.getParameter(x.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),timer:!!gl.getExtension('EXT_disjoint_timer_query_webgl2')};})()`);
evidence.errors=c.events.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Log.entryAdded'&&e.params.entry.level==='error')||(e.method==='Runtime.consoleAPICalled'&&e.params.type==='error'));
await writeFile(new URL('checks.json',output),JSON.stringify(evidence,null,2));
console.log(JSON.stringify({context:evidence.context.length,hmr:evidence.hmr.length,errors:evidence.errors,visibility:evidence.visibility, gpu:evidence.gpu}));
c.close();
