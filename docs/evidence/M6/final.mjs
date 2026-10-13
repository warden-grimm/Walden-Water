// M6 final evidence: default beam, shaft on/off, moved light (clipping check),
// touch regression and a 6 s motion clip. usage: node final.mjs <outDir> <w> <h> <dpr>
import { connect, browserSend, sleep } from '../M3/cdp.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const [outArg, w = 1440, h = 900, dpr = 1] = process.argv.slice(2);
const out = resolve(outArg); await mkdir(out, { recursive: true });
const [width, height, scale] = [w, h, dpr].map(Number);
const f = await browserSend('Target.createTarget', { url: 'about:blank' }); const c = await connect(f.targetId);
const shot = async n => writeFile(resolve(out, `${n}.png`), Buffer.from((await c.send('Page.captureScreenshot')).data, 'base64'));
const set = async js => { await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;${js};d.apply()})()`); await sleep(500); };
const result = { measuredAt: new Date().toISOString(), width, height, dpr: scale };
try {
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: width < height });
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
  await c.send('Page.navigate', { url: 'http://127.0.0.1:5174/?debug' }); await browserSend('Target.activateTarget', { targetId: f.targetId }); await sleep(2500);
  await set('d.hidePanel()');
  await shot('default');
  await c.ev(`void (()=>{window.__chunks=[];window.__rec=new MediaRecorder(document.querySelector('canvas').captureStream(30),{mimeType:'video/webm',videoBitsPerSecond:3000000});__rec.ondataavailable=e=>__chunks.push(e.data);__rec.start()})()`);
  await sleep(6000);
  const clip = await c.ev(`new Promise(r=>{__rec.onstop=()=>{__rec.stream.getTracks().forEach(t=>t.stop());const fr=new FileReader();fr.onload=()=>r(fr.result.split(',')[1]);fr.readAsDataURL(new Blob(__chunks,{type:'video/webm'}));};__rec.stop();})`);
  await writeFile(resolve(out, 'beam.webm'), Buffer.from(clip, 'base64'));
  await set('d.config.shaft.enabled=false'); await shot('shaft-off');
  await set('d.config.shaft.enabled=true;d.config.light.x=-1.5;d.config.light.targetX=1.2;d.config.light.targetY=2.5'); await shot('light-moved');
  await set('d.config.light.x=-3.5;d.config.light.targetX=0;d.config.light.targetY=4');
  const x = width / 2, y = height * 0.35;
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] });
  for (let i = 1; i <= 8; i++) { await sleep(16); await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: x + width * 0.02 * i, y }] }); }
  await sleep(150); await shot('touch-in-beam');
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(2200);
  const snap = await c.ev('__WALDEN_DEBUG__.snapshot()');
  result.touch = { available: snap.touch.available, bursts: snap.particles.bursts.emitted, contactsAfterRelease: snap.touch.count, field: await c.ev('__WALDEN_DEBUG__.inspectTouch().max') };
  result.pipeline = { draws: snap.drawCalls, triangles: snap.triangles, programs: snap.programs, textures: snap.textures, shaft: snap.shaft, capture: snap.capture };
  result.console = c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'warn'].includes(e.params.type)) || (e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params.entry.level))).map(e => JSON.stringify(e.params).slice(0, 300));
  await writeFile(resolve(out, 'final.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ touch: result.touch, draws: result.pipeline.draws, console: result.console }));
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: f.targetId }); }
