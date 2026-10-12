// Adapted from claude-checkpoint/probes/velocity.mjs: controlled event timestamps (ms),
// rAF timestamps (ms), mismatched cadences, drift, hold expiry, jitter, clock skew, pointer lifecycle.
import { pathToFileURL } from 'node:url';
const root = process.argv[2] || 'C:/Users/Adam Tate/orca/workspaces/Walden-Water/claude-m4-fix-review/';
const src = p => pathToFileURL(root + p).href;
const { config } = await import(src('src/config.js'));
const { createCamera } = await import(src('src/scene/camera.js'));
const { createPointerTracker } = await import(src('src/interaction/PointerTracker.js'));
const { Vector2, Raycaster } = await import(src('node_modules/three/build/three.module.js'));
const { intersectCurtain } = await import(src('src/interaction/curtainContact.js'));
class Surface extends EventTarget { captures = new Set(); rect = { left: 0, top: 0, width: 1000, height: 1000 }; hidden = false;
  getBoundingClientRect() { return this.rect; } hasPointerCapture(id) { return this.captures.has(id); } setPointerCapture(id) { this.captures.add(id); } releasePointerCapture(id) { this.captures.delete(id); }
  send(type, x, y, ts, id = 1, pointerType = 'touch', buttons = 1) { const e = new Event(type, { cancelable: true }); Object.defineProperty(e, 'timeStamp', { value: ts });
    Object.assign(e, { pointerId: id, clientX: x, clientY: y, pointerType, buttons, button: 0 }); this.dispatchEvent(e); } }
function make(opts = {}) {
  const settings = structuredClone(config); Object.assign(settings.camera, opts.camera || {});
  const time = { value: 0 }, view = createCamera(settings, time); view.configure(1, !opts.drift);
  const canvas = new Surface(), win = new Surface(), doc = new Surface();
  return { settings, time, view, canvas, win, doc, t: createPointerTracker(canvas, settings, win, doc) };
}
const stats = a => ({ n: a.length, min: +Math.min(...a).toFixed(5), max: +Math.max(...a).toFixed(5), range: +(Math.max(...a) - Math.min(...a)).toFixed(5) });
function swipe({ inputHz = 60, renderHz = 60, pxPerS = 100, jitterMs = 0, skewMs = 0, drift = false, seconds = 0.5, stopAt = Infinity, seed = 1 }) {
  const m = make({ drift, camera: drift ? { driftSpeed: 3 } : {} }); const { t, canvas, view, time } = m;
  let rnd = seed; const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
  canvas.send('pointerdown', 420, 500, skewMs); t.update(view.camera, 0);
  const s = [], after = [], endErr = []; let next = 1, lastX = 420, lastEvent = 0;
  const ray = new Raycaster(), uv = new Vector2(), ndc = new Vector2();
  for (let f = 1; f <= renderHz * seconds; f++) {
    const sec = f / renderHz;
    while (next / inputHz <= sec + 1e-9) { const te = next++ / inputHz; if (te > stopAt) continue; lastX = 420 + pxPerS * te; lastEvent = te;
      canvas.send('pointermove', lastX, 500, te * 1000 + skewMs + jitterMs * rand()); }
    time.value = sec; view.updateCamera(!drift); t.update(view.camera, sec * 1000);
    ndc.set(lastX / 500 - 1, 0); ray.setFromCamera(ndc, view.camera); intersectCurtain(ray.ray, m.settings.curtain, uv);
    endErr.push(Math.hypot(t.segments[0].z - uv.x, t.segments[0].w - uv.y));
    if (sec >= 1 / inputHz && sec <= stopAt) s.push(t.strengths[0]); else if (sec > stopAt) after.push([+((sec - lastEvent) * 1000).toFixed(1), +t.strengths[0].toFixed(4)]);
  }
  t.dispose(); return { moving: stats(s), maxEndErrorUv: Math.max(...endErr), afterStop: after.slice(0, 12) };
}
const out = { hold: config.touch.holdStrength, gain: config.touch.velocityGain, velocityHold: config.touch.velocityHold, cadence: {}, drift: {}, expiry: {}, jitter: {}, skew: {}, pointers: {} };
for (const pxPerS of [50, 100, 1000]) for (const renderHz of [60, 120, 144]) out.cadence[`${pxPerS}px/s 60Hz-in ${renderHz}Hz-render`] = swipe({ pxPerS, renderHz, seconds: pxPerS > 500 ? 0.25 : 0.5 });
for (const renderHz of [60, 144]) out.cadence[`100px/s 125Hz-in ${renderHz}Hz-render`] = swipe({ inputHz: 125, renderHz });
for (const renderHz of [60, 120, 144]) out.drift[`100px/s drift x3 ${renderHz}Hz`] = swipe({ renderHz, drift: true });
{ const m = make({ drift: true, camera: { driftSpeed: 6 } }); const s = [];
  m.canvas.send('pointerdown', 500, 500, 0); for (let f = 0; f < 288; f++) { m.time.value = f / 144; m.view.updateCamera(false);
    if (f % 2 === 0) m.canvas.send('pointermove', 500, 500, f / 144 * 1000); m.t.update(m.view.camera, f / 144 * 1000); s.push(m.t.strengths[0]); }
  out.drift['stationary held, drift x6, 144Hz, repeated same-position moves'] = stats(s); m.t.dispose(); }
for (const renderHz of [120, 144]) out.expiry[`100px/s stop at 0.25s ${renderHz}Hz`] = swipe({ renderHz, stopAt: 0.25, seconds: 0.4 }).afterStop;
for (const j of [1, 2, 4]) out.jitter[`+-${j}ms timestamp jitter 60Hz-in 144Hz, 100px/s`] = swipe({ renderHz: 144, pxPerS: 100, jitterMs: j }).moving;
out.skew['events +200ms ahead of rAF clock, stop 0.25s (last 3 frames)'] = swipe({ renderHz: 144, stopAt: 0.25, seconds: 0.6, skewMs: 200 }).afterStop.slice(-3);
out.skew['events -1000ms behind rAF clock'] = swipe({ renderHz: 144, skewMs: -1000 }).moving;
{ const m = make(); const { t, canvas, view } = m;
  canvas.send('pointerdown', 500, 500, 0, 1, 'mouse'); canvas.send('pointerup', 500, 500, 2, 1, 'mouse'); canvas.send('pointerdown', 510, 500, 4, 1, 'mouse');
  t.update(view.camera, 8); const a = t.snapshot();
  canvas.send('pointermove', 600, 500, 10, 1, 'mouse'); t.update(view.camera, 16);
  out.pointers.sameFrameMouseRepress = { afterRepress: a, afterMove: { held: t.snapshot().pointers[0]?.held, count: t.count.value, captures: canvas.captures.size } };
  canvas.send('pointerup', 600, 500, 20, 1, 'mouse'); t.update(view.camera, 24); out.pointers.afterUp = { count: t.count.value, ids: t.snapshot().pointers.length, captures: canvas.captures.size };
  canvas.send('pointerdown', 500, 500, 30, 7, 'pen'); canvas.send('pointerup', 500, 500, 31, 7, 'pen'); canvas.send('pointerdown', 500, 500, 32, 7, 'pen');
  t.update(view.camera, 33); out.pointers.penRepress = t.snapshot();
  canvas.send('pointercancel', 0, 0, 34, 7, 'pen'); t.update(view.camera, 40); out.pointers.afterPenCancel = { count: t.count.value, captures: canvas.captures.size };
  canvas.send('pointerdown', 450, 400, 50, 2); t.update(view.camera, 50);
  canvas.send('pointermove', 470, 400, 66, 2); canvas.send('pointerdown', 550, 600, 67, 3); t.update(view.camera, 68);
  const seg = t.segments[0]; out.pointers.secondFingerKeepsSweep = { count: t.count.value, sweepDu: +(seg.z - seg.x).toFixed(4), strength0: +t.strengths[0].toFixed(4) };
  canvas.send('pointermove', 1200, 400, 83, 2); t.update(view.camera, 84); const outside = t.count.value;
  canvas.send('pointermove', 480, 400, 100, 2); t.update(view.camera, 101);
  out.pointers.reentry = { countOutside: outside, countBack: t.count.value, strengthBack: +t.strengths[0].toFixed(4), segment: t.segments[0].toArray().map(v => +v.toFixed(4)) };
  m.win.dispatchEvent(new Event('blur')); t.update(view.camera, 120); out.pointers.afterBlur = { count: t.count.value, ids: t.snapshot().pointers.length, captures: canvas.captures.size };
  canvas.send('pointerdown', 500, 500, 130, 4); m.doc.hidden = true; m.doc.dispatchEvent(new Event('visibilitychange')); t.update(view.camera, 140);
  out.pointers.afterHidden = { count: t.count.value, captures: canvas.captures.size };
  canvas.send('pointerdown', 500, 500, 150, 5); canvas.captures.delete(5); canvas.dispatchEvent(Object.assign(new Event('lostpointercapture'), { pointerId: 5 })); t.update(view.camera, 160);
  out.pointers.afterLostCapture = t.count.value; t.dispose(); }
console.log(JSON.stringify(out, null, 1));
