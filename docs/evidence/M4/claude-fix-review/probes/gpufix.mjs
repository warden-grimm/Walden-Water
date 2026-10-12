// r2 GPU checks on real Edge/ANGLE (CDP 9334, preview 5175): byte decay residue, visible decay
// regression vs half-float, lip-crossing backtrace, allocation failure/disposal/state restoration.
import { connect, browserSend, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const c = await connect(); await c.send('Runtime.enable'); await c.send('Page.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' });
await browserSend('Target.activateTarget', { targetId: c.target.id }); await sleep(2000);
const r = await c.ev(String.raw`(async()=>{
  const source = await (await fetch('/src/interaction/TouchField.js')).text();
  const T = await import(source.match(/from\s+["']([^"']*three[^"']*)["']/)[1]);
  const { createTouchField } = await import('/src/interaction/TouchField.js');
  const { config: base } = await import('/src/config.js');
  const renderer = new T.WebGLRenderer({ canvas: document.createElement('canvas') });
  const gl = renderer.getContext();
  function make(touch = {}, water = {}) {
    const config = structuredClone(base); Object.assign(config.touch, touch); Object.assign(config.water, water);
    const pointers = { count: { value: 0 }, segments: Array.from({ length: 10 }, () => new T.Vector4()), strengths: new Float32Array(10), clear() { this.count.value = 0; } };
    const field = createTouchField(renderer, config, pointers); field.configure();
    const hold = list => { pointers.count.value = list.length; list.forEach(([u0, v0, u1, v1, s], i) => { pointers.segments[i].set(u0, v0, u1, v1); pointers.strengths[i] = s; }); };
    const run = (seconds, dt) => { for (let i = 0, n = Math.round(seconds / dt); i < n; i++) field.update(dt); };
    return { config, field, hold, run };
  }
  const neutral = q => q.max === 0 && q.minX === 0 && q.maxX === 0;
  const out = { decay: {}, visible: {}, lip: {}, failure: {} };
  // A. Residue: r1 failing cases plus defaults at 360/480 Hz; both formats.
  for (const p of ['auto', 'byte']) for (const [hz, rec, th, tr] of [[480, 1.6, 0.001, 0], [480, 1.6, 0.001, 0.7], [360, 1.6, 0.001, 0.7], [165, 3, 0.001, 0], [240, 3, 0.001, 0], [144, 3, 0.0005, 0], [60, 1.6, 0.001, 0.7]]) {
    const h = make({ precision: p, recovery: rec, neutralThreshold: th, transport: tr });
    h.hold([[0.4, 0.6, 0.6, 0.6, 1]]); h.run(0.5, 1 / hz); h.hold([]);
    let t = 0, q; while (t < 12) { h.run(0.05, 1 / hz); t += 0.05; q = h.field.inspect(); if (neutral(q)) break; }
    out.decay[p + '_' + hz + 'Hz_R' + rec + '_th' + th + '_tr' + tr] = { tNeutral: neutral(q) ? +t.toFixed(2) : null, minX: q.minX, maxX: q.maxX, max: q.max };
    h.field.dispose();
  }
  // B. Visible-range regression: byte vs half-float trajectory at default 60/144 Hz.
  for (const hz of [60, 144]) {
    const rows = {};
    for (const p of ['auto', 'byte']) { const h = make({ precision: p }); h.hold([[0.4, 0.6, 0.6, 0.6, 1]]); h.run(0.3, 1 / hz); h.hold([]); rows[p] = [];
      for (const T of [0.25, 0.5, 1.0]) { h.run(T - (rows[p].at(-1)?.T ?? 0), 1 / hz); const q = h.field.inspect(); rows[p].push({ T, max: +q.max.toFixed(5), sum: +q.sum.toFixed(3), maxX: +q.maxX.toFixed(5), cV: q.centroidV && +q.centroidV.toFixed(4) }); }
      h.field.dispose(); }
    out.visible[hz + 'Hz'] = rows;
  }
  // C. Lip crossing. Extreme flow/transport and a large substep, energy injected just below the lip.
  for (const [label, touch, water, hz] of [['default60', {}, {}, 60], ['extreme', { transport: 1.5, maxStep: 1 / 30, diffusion: 0 }, { flowSpeed: 2, lipSpeed: 0.1, gravity: 5 }, 30], ['extremeNoGravity', { transport: 1.5, maxStep: 1 / 30, diffusion: 0 }, { flowSpeed: 2, lipSpeed: 0.1, gravity: 0 }, 30]]) {
    for (const p of ['auto', 'byte']) { const h = make({ precision: p, recovery: 3, ...touch }, water); h.hold([[0.5, 0.97, 0.5, 0.97, 1]]); h.field.update(1 / hz); h.hold([]);
      const rows = [h.field.inspect()]; for (let i = 0; i < 4; i++) { h.field.update(1 / hz); rows.push(h.field.inspect()); }
      out.lip[label + '_' + p] = rows.map(q => ({ sum: +q.sum.toFixed(3), cV: q.centroidV && +q.centroidV.toFixed(4), max: +q.max.toFixed(4) })); h.field.dispose(); }
  }
  // D. Failure: corrupt validation readbacks; check disposal, renderer state restoration and retry.
  const original = gl.readPixels; let corrupt = true;
  gl.readPixels = function (...a) { original.apply(this, a); if (corrupt && a[2] === 1 && a[3] === 1 && ArrayBuffer.isView(a[6])) a[6].fill(7); };
  const warns = []; const warn = console.warn; console.warn = (...a) => { warns.push(String(a[0])); };
  try {
    const sentinel = new T.WebGLRenderTarget(4, 4); renderer.setRenderTarget(sentinel); renderer.autoClear = true;
    const tex0 = renderer.info.memory.textures;
    const h = make({}); const s1 = h.field.snapshot();
    const state = { targetRestored: renderer.getRenderTarget() === sentinel, autoClear: renderer.autoClear };
    for (let i = 0; i < 5; i++) { h.config.touch.width = i % 2 ? 128 : 256; h.field.configure(); } // retries via size change, still corrupt
    const texAfterRetries = renderer.info.memory.textures;
    h.field.update(1 / 60); const inspected = h.field.inspect();
    corrupt = false; h.field.contextRestored(); h.field.configure(); const s2 = h.field.snapshot();
    const enabledAfterRestoreRetry = h.config.touch.enabled;
    h.config.touch.enabled = true; h.field.configure(); const s3 = h.field.snapshot();
    renderer.setRenderTarget(null); h.field.dispose(); sentinel.dispose();
    out.failure = { s1, state, texBefore: tex0, texAfterRetries, texAfterDispose: renderer.info.memory.textures, inspected, s2, enabledAfterRestoreRetry, s3, warns };
  } finally { gl.readPixels = original; console.warn = warn; }
  out.extensions = gl.getSupportedExtensions().filter(e => /color_buffer|float/.test(e));
  renderer.dispose(); return out;
})()`);
writeFileSync(new URL('../out/gpufix.json', import.meta.url), JSON.stringify(r, null, 1));
console.log(JSON.stringify(r));
c.close();
