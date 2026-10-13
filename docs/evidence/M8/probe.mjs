// M8 behaviour probe: node docs/evidence/M8/probe.mjs <outDir> <width> <height> <dpr> [adaptive]
// Post toggles (each pass off, then all), resource counts, context restore,
// visibility pause, save/reset round trip through the normal page, and (with
// the `adaptive` argument) a synthetic-overload trace: overload, recovery, and
// a resolution-dependent load that only 2x cannot sustain (backoff, no
// oscillation), checking buffer/target sizes and touch mapping at each level.
import { connect, browserSend, sleep } from '../M3/cdp.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const [out, width, height, dpr, mode] = process.argv.slice(2);
if (!out) throw new Error('Usage: probe.mjs <outDir> <width> <height> <dpr> [adaptive]');
await mkdir(out, { recursive: true });
const w = Number(width), h = Number(height);
const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(fresh.targetId);
const steps = [];
const shot = async name => { const s = await c.send('Page.captureScreenshot', { format: 'png' }); await writeFile(`${out}/${name}.png`, Buffer.from(s.data, 'base64')); };
const set = settings => c.ev(`void (()=>{const d=__WALDEN_DEBUG__;for(const [k,v] of Object.entries(${JSON.stringify(settings)})){const [g,key]=k.split('.');d.config[g][key]=v;}d.apply()})()`);
const snap = () => c.ev(`(()=>{const s=__WALDEN_DEBUG__.snapshot();return {dpr:s.dpr,buffer:s.buffer,adaptive:s.adaptive,post:s.post,
  capture:[s.capture.width,s.capture.height],field:s.touch.available,draws:s.drawCalls,geometries:s.geometries,textures:s.textures,programs:s.programs,
  running:s.running,frames:s.frames,restores:s.restores,savedSettings:s.savedSettings,touch:s.touch.pointers}})()`);
const load = async (path = '/?debug') => {
  await c.send('Page.navigate', { url: `http://127.0.0.1:5174${path}` });
  await browserSend('Target.activateTarget', { targetId: fresh.targetId });
  await sleep(4000);
};
// Hold one finger at a fixed CSS point and read its curtain UV (same point at every resolution).
async function touchUv() {
  const x = Math.round(w * 0.5), y = Math.round(h * 0.45);
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 7, x, y }] });
  await sleep(150);
  const pointers = (await snap()).touch;
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  return pointers[0]?.uv ?? null;
}
try {
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: Number(dpr), mobile: w < h || w < 900 });
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
  await load();
  await c.ev('void __WALDEN_DEBUG__.hidePanel()');
  await c.ev('void __WALDEN_DEBUG__.resetSettings()'); // clean start: no saved settings in this profile
  await set({ 'camera.drift': false });
  await sleep(600);
  steps.push({ step: 'start', ...await snap(), uv: await touchUv() });
  await shot('post-default');
  // Each pass alone off, then all off (direct rendering, M7 path), then back on.
  for (const [name, settings] of [['bloom-off', { 'post.bloom': false }], ['vignette-off', { 'post.vignette': false }],
    ['grain-off', { 'post.grain': false }], ['all-off', { 'post.enabled': false }],
    ['zero-effects', { 'post.bloom': false, 'post.vignette': false, 'post.grain': false }]]) {
    await set(settings); await sleep(500);
    steps.push({ step: name, ...await snap() });
    await shot(name);
    await set({ 'post.enabled': true, 'post.bloom': true, 'post.vignette': true, 'post.grain': true });
  }
  await sleep(400);
  steps.push({ step: 'restored-defaults', ...await snap() });

  if (mode === 'adaptive') {
    const trace = [];
    const poll = async (label, seconds) => {
      for (let t = 0; t < seconds; t += 0.5) {
        await sleep(500);
        const s = await snap();
        trace.push({ label, t, dpr: s.dpr, buffer: [s.buffer.width, s.buffer.height], post: s.post.target && [s.post.target.width, s.post.target.height],
          capture: s.capture, scale: s.adaptive.scale, backoff: s.adaptive.backoff, meanMs: +s.adaptive.meanMs.toFixed(1) });
      }
    };
    // Synthetic load proportional to buffer pixels (ms per megapixel).
    await set({ 'adaptive.simulateLoad': 40 }); await poll('overload', 12);
    steps.push({ step: 'overloaded', ...await snap(), uv: await touchUv() });
    await shot('adaptive-low');
    await set({ 'adaptive.simulateLoad': 0 }); await poll('recovery', 24);
    steps.push({ step: 'recovered', ...await snap(), uv: await touchUv() });
    // Only the 2x level is too slow: upgrades must back off, not oscillate.
    await set({ 'adaptive.simulateLoad': 18 }); await poll('resolution-dependent', 100);
    await set({ 'adaptive.simulateLoad': 0 });
    const changes = trace.filter((r, i) => i && r.scale !== trace[i - 1].scale).map(r => ({ label: r.label, t: r.t, scale: r.scale, backoff: r.backoff }));
    steps.push({ step: 'adaptive-changes', changes });
    // Sizes always agree with the current ratio.
    steps.push({ step: 'adaptive-size-consistency', ok: trace.every(r => r.buffer[0] === Math.round(w * r.dpr) && (!r.post || (r.post[0] === r.buffer[0] && r.post[1] === r.buffer[1])) && r.capture[0] === r.buffer[0]) });
    await writeFile(`${out}/adaptive-trace.json`, JSON.stringify(trace, null, 2));
  }

  // Context loss/restore with post-processing active.
  await c.ev('void __WALDEN_DEBUG__.loseContext()'); await sleep(800);
  await c.ev('void __WALDEN_DEBUG__.restoreContext()'); await sleep(2500);
  steps.push({ step: 'after-context-restore', ...await snap() });
  await shot('after-context-restore');
  // Visibility pause: a second tab in front hides this page.
  const before = (await snap()).frames;
  const cover = await browserSend('Target.createTarget', { url: 'about:blank' });
  await sleep(1500);
  const hidden = await c.ev('({hidden:document.hidden, frames:__WALDEN_DEBUG__.snapshot().frames, running:__WALDEN_DEBUG__.snapshot().running})');
  await browserSend('Target.closeTarget', { targetId: cover.targetId });
  await browserSend('Target.activateTarget', { targetId: fresh.targetId });
  await sleep(1000);
  steps.push({ step: 'visibility', hidden, framesWhileHidden: hidden.frames - before, after: await snap() });
  // Save -> the normal page uses it; reset -> the normal page is back to defaults.
  await set({ 'shaft.intensity': 0.2 });
  await c.ev('void __WALDEN_DEBUG__.saveSettings()'); await sleep(500);
  const stored = await c.ev("localStorage.getItem('walden.settings.v1')");
  await load('/');
  await shot('normal-page-saved');
  await load();
  await c.ev('void __WALDEN_DEBUG__.hidePanel()');
  const reloaded = await snap();
  const intensity = await c.ev('__WALDEN_DEBUG__.config.shaft.intensity');
  await c.ev('void __WALDEN_DEBUG__.resetSettings()'); await sleep(300);
  const afterReset = { stored: await c.ev("localStorage.getItem('walden.settings.v1')"), intensity: await c.ev('__WALDEN_DEBUG__.config.shaft.intensity') };
  await load('/');
  await shot('normal-page-reset');
  steps.push({ step: 'save-reset', stored, debugPageAfterSave: { savedSettings: reloaded.savedSettings, intensity }, afterReset });

  const console_ = c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'warn'].includes(e.params.type)) || (e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params.entry.level)));
  const info = [...new Set(c.events.filter(e => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'info').map(e => e.params.args.map(a => a.value).join(' ')))];
  await writeFile(`${out}/probe.json`, JSON.stringify({ measuredAt: new Date().toISOString(), viewport: { width: w, height: h, dpr: Number(dpr) }, steps, info, console: console_.map(e => JSON.stringify(e.params).slice(0, 400)) }, null, 2));
  for (const s of steps) console.log(JSON.stringify(s).slice(0, 600));
  console.log('console warnings/errors:', console_.length, console_.slice(0, 3).map(e => JSON.stringify(e.params).slice(0, 300)));
  if (console_.length) process.exitCode = 1;
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
