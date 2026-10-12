// Claude M4 r1 probe: own checkout on 5175, isolated Edge CDP9334.
import { connect, sleep } from './cdp.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const out = new URL('./p1/', import.meta.url); await mkdir(out, { recursive: true });
const list = await (await fetch('http://127.0.0.1:9334/json/new?about:blank', { method: 'PUT' })).json();
const c = await connect(list.id);
await c.send('Runtime.enable'); await c.send('Log.enable'); await c.send('Page.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' }); await sleep(2500);
const R = { steps: [] };
const snap = () => c.ev('__WALDEN_DEBUG__.snapshot()');
const field = () => c.ev('__WALDEN_DEBUG__.inspectTouch()');
const touch = (type, pts) => c.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([id, x, y]) => ({ id, x, y, radiusX: 4, radiusY: 4, force: 1 })) });
const shot = async n => writeFile(new URL(n + '.png', out), Buffer.from((await c.send('Page.captureScreenshot')).data, 'base64'));
const apply = s => c.ev(`void (()=>{const d=__WALDEN_DEBUG__;${s};d.apply();d.hidePanel()})()`);
const log = async (name, extra = {}) => { const s = await snap(); R.steps.push({ name, count: s.touch.count, pointers: s.touch.pointers, format: s.touch.format, avail: s.touch.available, distinct: s.touch.distinctTargets, res: [s.geometries, s.textures, s.programs], vp: s.viewport, ...extra }); };
await log('start'); R.initial = await snap();
// 1. alignment: pressure view, drift on, contact at given CSS points
for (const orient of [[390, 844], [844, 390]]) {
  await c.send('Emulation.setDeviceMetricsOverride', { width: orient[0], height: orient[1], deviceScaleFactor: 2, mobile: true }); await sleep(600);
  await apply("d.config.water.view='touch pressure'");
  const W = orient[0], H = orient[1];
  for (const [fx, fy] of [[0.5, 0.2], [0.5, 0.5], [0.3, 0.75], [0.62, 0.35]]) {
    await c.ev('void __WALDEN_DEBUG__.resetTouch()'); await sleep(100);
    const x = Math.round(fx * W * 10) / 10, y = Math.round(fy * H * 10) / 10;
    await touch('touchStart', [[1, x, y]]); await sleep(300);
    const name = `align-${W}x${H}-${fx}-${fy}`; await shot(name);
    await log(name, { touchX: x, touchY: y }); await touch('touchEnd', []); await sleep(50);
  }
}
// 2. normal water sequence portrait: hold 3s, second finger, cancel, release, heal
await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await sleep(600);
await apply("d.config.water.view='water'; d.resetTouch()"); await sleep(300); await shot('water-idle');
await touch('touchStart', [[1, 195, 330]]); await sleep(3000); await shot('water-held3s'); await log('held3s', { field: await field() });
await touch('touchStart', [[1, 195, 330], [2, 260, 520]]); await sleep(500); await log('two'); await shot('water-two');
await touch('touchCancel', []); await sleep(100); await log('cancelled-all');
await sleep(500); await shot('water-cancel+0.6'); await log('c+0.6', { field: await field() });
await sleep(1500); await log('c+2.1', { field: await field() }); await shot('water-cancel+2.1');
// 3. fast/slow swipe strength comparison via field max after a single sweep
for (const [label, steps, dt] of [['slow', 30, 33], ['fast', 6, 16]]) {
  await c.ev('void __WALDEN_DEBUG__.resetTouch()'); await sleep(200);
  await touch('touchStart', [[3, 100, 300]]);
  for (let i = 1; i <= steps; i++) { await touch('touchMove', [[3, 100 + 190 * i / steps, 300]]); await sleep(dt); }
  const f = await field(); await touch('touchEnd', []); await log('swipe-' + label, { field: f });
  if (label === 'fast') await shot('water-fastswipe');
}
// 4. hidden / blur cleanup with held finger
await touch('touchStart', [[4, 195, 400]]); await sleep(300); await log('held-before-hide');
await c.send('Emulation.setFocusEmulationEnabled', { enabled: false });
await c.ev("void window.dispatchEvent(new Event('blur'))"); await sleep(100); await log('after-blur');
await touch('touchMove', [[4, 200, 410]]); await sleep(100); await log('move-after-blur');
await touch('touchEnd', []);
// 5. byte mode + overlay
await apply("d.config.touch.precision='byte'"); await sleep(300); await log('byte');
await apply("d.config.touch.overlay=true"); await touch('touchStart', [[5, 195, 330]]); await sleep(1500); await shot('byte-overlay-held'); await log('byte-held', { field: await field() });
await touch('touchEnd', []); await sleep(2500); await log('byte-healed', { field: await field() }); await shot('byte-overlay-healed');
await apply("d.config.touch.overlay=false"); await touch('touchStart', [[5, 195, 330]]); await sleep(1500); await shot('byte-water-held'); await touch('touchEnd', []);
// 6. context loss/restore in byte, then auto
for (const p of ['byte', 'auto']) {
  await apply(`d.config.touch.precision='${p}'`); await sleep(200);
  await c.ev('void __WALDEN_DEBUG__.loseContext()'); await sleep(500);
  await c.ev('void __WALDEN_DEBUG__.restoreContext()'); await sleep(1200);
  await touch('touchStart', [[6, 195, 330]]); await sleep(400); await log('restored-' + p, { field: await field() }); await touch('touchEnd', []); await sleep(200);
}
// 7. rebuild sizes
for (const [w, h] of [[128, 256], [512, 1024], [256, 512]]) { await apply(`d.config.touch.width=${w};d.config.touch.height=${h}`); await sleep(200); await log(`rebuild-${w}x${h}`); }
await sleep(2500); await log('final', { field: await field() });
R.console = c.events.filter(e => e.method === 'Runtime.exceptionThrown' || e.method === 'Runtime.consoleAPICalled' || e.method === 'Log.entryAdded').map(e => ({ m: e.method, type: e.params.type || e.params.entry?.level, text: e.params.args?.map(a => a.value ?? a.description).join(' ') || e.params.entry?.text || e.params.exceptionDetails?.text }));
await writeFile(new URL('results.json', out), JSON.stringify(R, null, 2));
console.log(JSON.stringify(R.steps.map(s => [s.name, s.count, s.format, s.res.join('/'), s.field ? [s.field.max.toFixed(4), s.field.centroidV?.toFixed(3), s.field.minX.toFixed(3), s.field.maxX.toFixed(3)].join(',') : ''])));
console.log(JSON.stringify(R.console));
c.close();
