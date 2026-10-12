// Claude M2 r1 independent browser checks. Edge CDP :9334, reviewer preview :5175.
// Temporary probes edit the review checkout and restore exact original bytes in finally.
import { connect, browserSend, sleep } from './cdp.mjs';
import { decodePng } from './png.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const ROOT = 'C:/Users/Adam Tate/orca/workspaces/Walden-Water/claude-m2-review/';
const URL0 = 'http://127.0.0.1:5175/';
const out = new URL('./', import.meta.url), ev = {}; const E = { captures: {}, gui: {}, normals: {}, context: [], hmr: [], files: {} };
const c = await connect(); ev.f = c.ev;
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
const sha = async p => createHash('sha256').update(await readFile(ROOT + p)).digest('hex');
async function size(width, height, deviceScaleFactor = 1) { await c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor, mobile: false }); await sleep(500); }
async function png(name) { await sleep(400); const s = await c.send('Page.captureScreenshot'); const b = Buffer.from(s.data, 'base64'); await writeFile(new URL(`${name}.png`, out), b); return b; }
async function shot(name) { await png(name); E.captures[name] = await ev.f('__WALDEN_DEBUG__.snapshot()'); }
const D = s => ev.f(`(()=>{const d=__WALDEN_DEBUG__;${s}; d.apply(); return d.snapshot().wall})()`);

await c.send('Page.navigate', { url: URL0 }); await sleep(1500);
E.normalUrl = await ev.f('({debug: !!window.__WALDEN_DEBUG__, gui:document.querySelectorAll(".lil-gui.lil-root").length, canvases:document.querySelectorAll("canvas").length})');
await c.send('Page.navigate', { url: URL0 + '?debug' }); await sleep(1500);
await browserSend('Target.activateTarget', { targetId: c.target.id });
// GUI inventory: every config key (except fixed diagnostics) has a controller.
E.gui = await ev.f(`(()=>{const root=document.querySelector('.lil-gui.lil-root'); const folders={};
 for(const f of root.querySelectorAll(':scope > .lil-children > .lil-gui')) folders[f.querySelector('.lil-title').textContent]=[...f.querySelectorAll('.lil-controller .lil-name')].map(n=>n.textContent);
 const cfg=__WALDEN_DEBUG__.config; const missing=[]; for(const [g,v] of Object.entries(cfg)){ if(g==='diagnostics')continue; for(const k of Object.keys(v)) if(!(folders[g]||[]).some(n=>n===k||n.startsWith(k+' ')))missing.push(g+'.'+k);}
 return {folders:Object.fromEntries(Object.entries(folders).map(([k,v])=>[k,v.length])), missing, rebuild:Object.values(folders).flat().filter(n=>n.includes('rebuild')), title:root.querySelector('.lil-title').textContent};})()`);
await ev.f('void __WALDEN_DEBUG__.hidePanel()');
await size(1440, 900); await shot('desktop');
await size(390, 844, 3); await shot('portrait');
await size(844, 390, 2); await shot('landscape');
await size(3840, 720); await shot('ultrawide');
await size(5760, 720); await shot('ultrawide-8to1'); // beyond the tested 6:1 bound
await size(1440, 900);
// Quality switch disposal: repeat preset toggles and verify geometry count stays at 2.
const q = [];
for (let i = 0; i < 4; i++) { await D(`d.config.wall.quality='reduced'`); await sleep(150); q.push(await ev.f('__WALDEN_DEBUG__.snapshot().geometries')); await D(`d.config.wall.quality='reference'`); await sleep(150); q.push(await ev.f('__WALDEN_DEBUG__.snapshot().geometries')); }
E.qualityToggleGeometries = q;
await D(`d.config.camera.drift=false; d.config.wet.trickleSpeed=0; d.config.curtain.opacity=0`);
await shot('rock-reference'); await D(`d.config.wall.quality='reduced'`); await shot('rock-reduced');
await D(`d.config.wall.quality='reference'; d.config.wall.view='wet mask'`); await shot('wet-mask');
await D(`d.config.wall.view='light mask'`); await shot('light-mask');
await D(`d.config.light.x=-6; d.config.light.targetY=3`); await shot('light-mask-moved');
await D(`d.config.wall.view='rock'`); await shot('rock-light-moved');
await D(`d.config.light.x=-3.5; d.config.light.targetY=4; d.config.wet.sheen=false`); await shot('sheen-off');
await D(`d.config.wet.sheen=true; d.config.wall.displacement=false`); await shot('displacement-off');
await D(`d.config.wall.displacement=true`); await shot('rock-reference-restored');
// Downward trickle: sample the wet view twice and measure vertical shift of the trickle pattern.
await D(`d.config.wall.view='wet mask'; d.config.wet.trickleSpeed=0.35`);
const a = decodePng(await png('trickle-a')); await sleep(500); const b = decodePng(await png('trickle-b'));
// Correlate a central column strip for vertical offsets -40..40 px.
function col(img, x0) { const v = []; for (let y = 0; y < img.height; y++) { let s = 0; for (let x = x0; x < x0 + 40; x++) s += img.data[(y * img.width + x) * img.bpp]; v.push(s); } return v; }
const ca = col(a, 700), cb = col(b, 700); let best = 0, bestScore = -Infinity;
for (let d = -40; d <= 40; d++) { let s = 0; for (let y = 100; y < 800; y++) s += ca[y] * cb[y + d]; if (s > bestScore) { bestScore = s; best = d; } }
E.trickleShiftPx = { best, note: 'positive = pattern moved down the screen between captures ~0.5-0.9 s apart' };
await D(`d.config.wall.view='rock'; d.config.camera.drift=true; d.config.curtain.opacity=0.28`);

// Normal/geometry agreement probe: compare interpolated shading N with rasterized face normal.
const frag = 'src/shaders/wall.frag.glsl', fragUrl = ROOT + frag, original = await readFile(fragUrl);
E.files.fragBefore = await sha(frag);
try {
  const probe = original.toString('utf8').replace('if (uView == 1) color = N * 0.5 + 0.5;',
    'if (uView == 1) { vec3 F = normalize(cross(dFdx(vWorld), dFdy(vWorld))); F *= sign(dot(F, V)); float k = dot(N, F); color = k > 0.95 ? vec3(0.,4.,0.) : k > 0.8 ? vec3(0.,0.,4.) : vec3(4.,0.,0.); }');
  if (probe === original.toString('utf8')) throw new Error('probe anchor not found');
  await writeFile(fragUrl, probe); await sleep(2500);
  await D(`d.config.camera.drift=false; d.config.curtain.opacity=0; d.config.wall.view='normals'`);
  for (const [label, setup] of [['reference', `d.config.wall.quality='reference'`], ['reduced', `d.config.wall.quality='reduced'`], ['flat', `d.config.wall.quality='reference'; d.config.wall.displacement=false`]]) {
    await D(setup); const img = decodePng(await png(`normal-agreement-${label}`)); let g = 0, bl = 0, r = 0, n = 0;
    for (let i = 0; i < img.width * img.height; i++) { const R = img.data[i * img.bpp], G = img.data[i * img.bpp + 1], B = img.data[i * img.bpp + 2]; const m = Math.max(R, G, B); if (m < 60) continue; n++; if (m === G) g++; else if (m === B) bl++; else r++; }
    E.normals[label] = { pixels: n, over095: +(g / n).toFixed(4), from080to095: +(bl / n).toFixed(4), under080: +(r / n).toFixed(4) };
  }
  await D(`d.config.wall.displacement=true; d.config.wall.view='rock'; d.config.camera.drift=true; d.config.curtain.opacity=0.28`);
} finally { await writeFile(fragUrl, original); await sleep(2500); }
E.files.fragAfter = await sha(frag);

await c.send('Page.reload'); await sleep(1500); await ev.f('void __WALDEN_DEBUG__.hidePanel()');
for (let i = 0; i < 3; i++) {
  await ev.f('__WALDEN_DEBUG__.sample(); __WALDEN_DEBUG__.loseContext()'); await sleep(500);
  const lost = await ev.f('({snapshot:__WALDEN_DEBUG__.snapshot(),sample:__WALDEN_DEBUG__.sampleStatus().state})');
  await ev.f('__WALDEN_DEBUG__.restoreContext()'); await sleep(1000);
  E.context.push({ lost, restored: await ev.f('__WALDEN_DEBUG__.snapshot()') });
}
// GPU timer still produces samples after context restore (short custom check of pool restoration).
E.timerAfterRestore = await ev.f(`(()=>{const gl=document.querySelector('canvas').getContext('webgl2');return {timerExt:!!gl.getExtension('EXT_disjoint_timer_query_webgl2'), lost: gl.isContextLost()};})()`);
const cfg = 'src/config.js', cfgUrl = ROOT + cfg, cfgOriginal = await readFile(cfgUrl); E.files.configBefore = await sha(cfg);
try {
  for (let i = 0; i < 5; i++) {
    await writeFile(cfgUrl, Buffer.concat([cfgOriginal, Buffer.from(`\n// Claude M2 review HMR probe ${i}\n`)])); await sleep(1200);
    E.hmr.push(await ev.f('({snapshot:__WALDEN_DEBUG__.snapshot(),canvases:document.querySelectorAll("canvas").length,panels:document.querySelectorAll(".lil-gui.lil-root").length})'));
  }
} finally { await writeFile(cfgUrl, cfgOriginal); await sleep(1200); }
E.files.configAfter = await sha(cfg);
E.afterHmrRestore = await ev.f('({snapshot:__WALDEN_DEBUG__.snapshot(),canvases:document.querySelectorAll("canvas").length,panels:document.querySelectorAll(".lil-gui.lil-root").length})');
await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await sleep(300);
E.reducedMotion = await ev.f('__WALDEN_DEBUG__.snapshot().camera');
await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
const blank = await browserSend('Target.createTarget', { url: 'about:blank', background: false });
await browserSend('Target.activateTarget', { targetId: blank.targetId }); await sleep(500);
const hiddenA = await ev.f('({s:__WALDEN_DEBUG__.snapshot(),vis:document.visibilityState})'); await sleep(800);
const hiddenB = await ev.f('({s:__WALDEN_DEBUG__.snapshot(),vis:document.visibilityState})');
await browserSend('Target.activateTarget', { targetId: c.target.id }); await sleep(500);
E.visibility = { hiddenA: [hiddenA.vis, hiddenA.s.frames, hiddenA.s.elapsed], hiddenB: [hiddenB.vis, hiddenB.s.frames, hiddenB.s.elapsed], resumed: await ev.f('[document.visibilityState, __WALDEN_DEBUG__.snapshot().frames, __WALDEN_DEBUG__.snapshot().elapsed]') };
await browserSend('Target.closeTarget', { targetId: blank.targetId });
E.gpu = await ev.f(`(()=>{const gl=document.querySelector('canvas').getContext('webgl2'),x=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:x?gl.getParameter(x.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER), precision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision};})()`);
E.consoleIssues = c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params.entry.level)) || (e.method === 'Runtime.consoleAPICalled' && ['error', 'warn'].includes(e.params.type))).map(e => JSON.stringify(e.params).slice(0, 400));
await writeFile(new URL('claude-checks.json', out), JSON.stringify(E, null, 2));
console.log(JSON.stringify({ normalUrl: E.normalUrl, gui: E.gui, q: E.qualityToggleGeometries, trickle: E.trickleShiftPx, normals: E.normals, files: E.files, context: E.context.map(x => [x.lost.sample, x.lost.snapshot.running, x.restored.running, x.restored.restores, x.restored.geometries, x.restored.programs]), hmr: E.hmr.map(h => [h.canvases, h.panels, h.snapshot.geometries, h.snapshot.programs, h.snapshot.running]), afterHmr: [E.afterHmrRestore.canvases, E.afterHmrRestore.panels, E.afterHmrRestore.snapshot.geometries], reduced: E.reducedMotion, vis: E.visibility, gpu: E.gpu, console: E.consoleIssues, walls: Object.fromEntries(Object.entries(E.captures).map(([k, v]) => [k, [v.buffer, v.wall.size, v.triangles]])) }, null, 1));
c.close();
