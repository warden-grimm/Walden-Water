// M7 behaviour probe: node docs/evidence/M7/probe.mjs <outDir> <width> <height> <dpr>
// Captures the pool at rest and in its debug views, a low swipe whose droplets
// land on the pool (pool + ripple views at matched delays), the byte ripple
// path, a moved light, pool/mist disabled, rebuilds and a context restore.
import { connect, browserSend, sleep } from '../M3/cdp.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const [out, width, height, dpr] = process.argv.slice(2);
if (!out) throw new Error('Usage: probe.mjs <outDir> <width> <height> <dpr>');
await mkdir(out, { recursive: true });
const w = Number(width), h = Number(height);
const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(fresh.targetId);
const steps = [];
const shot = async name => { const s = await c.send('Page.captureScreenshot', { format: 'png' }); await writeFile(`${out}/${name}.png`, Buffer.from(s.data, 'base64')); };
const set = settings => c.ev(`void (()=>{const d=__WALDEN_DEBUG__;for(const [k,v] of Object.entries(${JSON.stringify(settings)})){const [g,key]=k.split('.');d.config[g][key]=v;}d.apply()})()`);
const snap = () => c.ev('(()=>{const s=__WALDEN_DEBUG__.snapshot();return {pool:s.pool,mist:s.particles.mist,bursts:s.particles.bursts,draws:s.drawCalls,triangles:s.triangles,geometries:s.geometries,textures:s.textures,programs:s.programs,restores:s.restores,running:s.running}})()');
async function swipe(prefix, view) {
  await set({ 'pool.view': view });
  await sleep(1500); // let earlier splashes finish
  const before = (await snap()).bursts.emitted;
  // Low on the curtain, left to right, about 0.17 s: droplets reach the pool quickly.
  const y = Math.round(h * 0.71), x0 = Math.round(w * 0.28), dx = Math.round(w * 0.044);
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: x0, y }] });
  for (let i = 1; i <= 10; i++) { await sleep(16); await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: x0 + dx * i, y }] }); }
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const start = Date.now();
  for (const ms of [300, 600, 900, 1300, 2000]) { await sleep(Math.max(0, ms - (Date.now() - start))); await shot(`${prefix}-${view}-${ms}ms`); }
  steps.push({ step: `${prefix}-${view}`, splashes: (await snap()).bursts.emitted - before });
}
try {
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: Number(dpr), mobile: w < h || w < 900 });
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
  await c.send('Page.navigate', { url: 'http://127.0.0.1:5174/?debug' });
  await browserSend('Target.activateTarget', { targetId: fresh.targetId });
  await sleep(4000);
  await c.ev('void __WALDEN_DEBUG__.hidePanel()');
  await set({ 'camera.drift': false });
  await sleep(500);
  const base = await snap(); steps.push({ step: 'start', ...base });
  await shot('idle');
  for (const view of ['ripples', 'normals', 'reflection']) { await set({ 'pool.view': view }); await sleep(500); await shot(`view-${view}`); }
  await swipe('swipe', 'pool');
  await swipe('swipe', 'ripples');
  await set({ 'pool.view': 'pool', 'pool.enabled': false, 'mist.enabled': false }); await sleep(500); await shot('pool-off');
  await set({ 'pool.enabled': true, 'mist.enabled': true });
  // Shared light aimed low: the beam, rock, pool and low mist are lit together.
  await set({ 'light.targetY': 1.2 }); await sleep(600); await shot('light-low');
  await set({ 'light.targetY': 4 });
  await set({ 'pool.precision': 'byte' }); await sleep(600); steps.push({ step: 'byte', ...await snap() }); await shot('byte-idle');
  await set({ 'pool.view': 'ripples' }); await sleep(300); await shot('byte-ripples');
  await set({ 'pool.view': 'pool', 'pool.precision': 'auto' }); await sleep(300);
  // Rebuild controls, then back to defaults: counts must return to the start values.
  await set({ 'pool.impactRings': 80, 'pool.rippleResolution': 64, 'mist.count': 60 }); await sleep(400);
  steps.push({ step: 'rebuilt', ...await snap() });
  await set({ 'pool.impactRings': 40, 'pool.rippleResolution': 96, 'mist.count': 28 }); await sleep(400);
  steps.push({ step: 'restored-defaults', ...await snap() });
  await c.ev('void __WALDEN_DEBUG__.loseContext()'); await sleep(800);
  await c.ev('void __WALDEN_DEBUG__.restoreContext()'); await sleep(2500);
  steps.push({ step: 'after-context-restore', ...await snap() });
  await shot('after-context-restore');
  await swipe('restored', 'pool');
  const console_ = c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'warn'].includes(e.params.type)) || (e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params.entry.level)));
  const info = [...new Set(c.events.filter(e => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'info').map(e => e.params.args.map(a => a.value).join(' ')))];
  await writeFile(`${out}/probe.json`, JSON.stringify({ measuredAt: new Date().toISOString(), viewport: { width: w, height: h, dpr: Number(dpr) }, steps, info, console: console_.map(e => JSON.stringify(e.params).slice(0, 400)) }, null, 2));
  for (const s of steps) console.log(JSON.stringify(s));
  console.log('info:', info);
  console.log('console warnings/errors:', console_.length);
  if (console_.length) process.exitCode = 1;
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
