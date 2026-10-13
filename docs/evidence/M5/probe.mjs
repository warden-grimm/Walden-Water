// M5 visual/behaviour probe. Isolated Edge on CDP :9333, preview on :5174.
// usage: node docs/evidence/M5/probe.mjs <outDir> [width height dpr]
import { connect, browserSend, sleep } from '../M3/cdp.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const out = resolve(process.argv[2] || 'docs/evidence/M5/probe');
const [width, height, dpr] = (process.argv.slice(3).length ? process.argv.slice(3) : [1440, 900, 1]).map(Number);
await mkdir(out, { recursive: true });
const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(fresh.targetId);
const shot = async name => writeFile(resolve(out, `${name}.png`), Buffer.from((await c.send('Page.captureScreenshot')).data, 'base64'));
const result = { measuredAt: new Date().toISOString(), width, height, dpr, steps: [] };
try {
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: width < height });
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
  await c.send('Page.navigate', { url: 'http://127.0.0.1:5174/?debug' });
  await browserSend('Target.activateTarget', { targetId: fresh.targetId });
  await sleep(2500);
  await c.ev('void __WALDEN_DEBUG__.hidePanel()');
  await shot('idle');
  result.idle = await c.ev('__WALDEN_DEBUG__.snapshot()');
  // Record the canvas through a fast swipe (clip cadence is not performance evidence).
  await c.ev(`void (()=>{window.__chunks=[];window.__rec=new MediaRecorder(document.querySelector('canvas').captureStream(30),{mimeType:'video/webm',videoBitsPerSecond:2500000});__rec.ondataavailable=e=>__chunks.push(e.data);__rec.start()})()`);
  await sleep(500);
  // Fast horizontal swipe across the middle of the curtain, then a held finger.
  const y = height * 0.45, x0 = width * 0.38, x1 = width * 0.62;
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: x0, y }] });
  for (let i = 1; i <= 8; i++) {
    await sleep(16);
    await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: x0 + (x1 - x0) * i / 8, y }] });
  }
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(250); await shot('swipe-250ms');
  result.steps.push({ step: 'fast swipe', particles: (await c.ev('__WALDEN_DEBUG__.snapshot()')).particles });
  await sleep(500); await shot('swipe-750ms');
  await sleep(1500);
  const clip = await c.ev(`new Promise(resolve=>{__rec.onstop=()=>{__rec.stream.getTracks().forEach(t=>t.stop());const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(__chunks,{type:'video/webm'}));};__rec.stop();})`);
  await writeFile(resolve(out, 'swipe.webm'), Buffer.from(clip, 'base64'));
  await sleep(1500);
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 2, x: width / 2, y: height * 0.3 }] });
  await sleep(3000);
  result.steps.push({ step: 'held 3s', particles: (await c.ev('__WALDEN_DEBUG__.snapshot()')).particles });
  await shot('held');
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(2000);
  result.steps.push({ step: 'released 2s', particles: (await c.ev('__WALDEN_DEBUG__.snapshot()')).particles });
  // Move the shared light: dust/mist and droplet sparkle must follow the mask.
  await c.ev("void (()=>{const d=__WALDEN_DEBUG__;d.config.light.targetX=1.5;d.config.light.x=-1.5;d.apply()})()");
  await sleep(1200); await shot('light-moved');
  await c.ev("void (()=>{const d=__WALDEN_DEBUG__;d.config.light.targetX=0;d.config.light.x=-3.5;d.apply()})()");
  // Context loss/restoration: particles must resume, with no errors.
  await c.ev('void __WALDEN_DEBUG__.loseContext()'); await sleep(600);
  await c.ev('void __WALDEN_DEBUG__.restoreContext()'); await sleep(1500);
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 3, x: x0, y }] });
  for (let i = 1; i <= 8; i++) { await sleep(16); await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 3, x: x0 + (x1 - x0) * i / 8, y }] }); }
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(250); await shot('after-context-restore');
  const restored = await c.ev('__WALDEN_DEBUG__.snapshot()');
  result.steps.push({ step: 'context restored + swipe', restores: restored.restores, running: restored.running, particles: restored.particles });
  result.console = c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'warn'].includes(e.params.type)) || (e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params.entry.level)));
  await writeFile(resolve(out, 'probe.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ steps: result.steps, console: result.console.map(e => JSON.stringify(e.params).slice(0, 400)) }, null, 1));
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
