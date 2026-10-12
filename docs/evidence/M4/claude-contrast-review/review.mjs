// Claude M4-r2 scratch probe: CDP 9334, preview 5175. Not tracked.
import { connect, browserSend, sleep } from './cdp.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const out = new URL('./out/', import.meta.url); await mkdir(out, { recursive: true });
const old = { rock: '#525c66', water: '#88adb7', opacity: 0.36 };
const next = { rock: '#4b555e', water: '#9cbdc6', opacity: 0.40 };
const shot = async (c, name) => writeFile(new URL(name, out), Buffer.from((await c.send('Page.captureScreenshot')).data, 'base64'));
const result = { measuredAt: new Date().toISOString(), views: [], plain: [] };
const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(fresh.targetId);
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
try {
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
  // 1. Production route (no ?debug) with shipped defaults, both orientations.
  for (const [w, h] of [[390, 844], [844, 390]]) {
    await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/' });
    await browserSend('Target.activateTarget', { targetId: fresh.targetId }); await sleep(2500);
    await shot(c, `plain-${w}x${h}.png`);
    result.plain.push({ w, h, gui: await c.ev('document.querySelectorAll(".lil-gui").length'), canvas: await c.ev('[innerWidth, innerHeight, document.querySelector("canvas").width, document.querySelector("canvas").height]') });
  }
  await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' }); await sleep(2500);
  result.browser = await c.ev('navigator.userAgent');
  result.loadedDefaults = await c.ev('(()=>{const d=__WALDEN_DEBUG__.config;return {rock:d.rock.color, water:d.curtain.color, opacity:d.curtain.opacity, wet:d.wet, light:d.light}})()');
  // Count pointer events really delivered to the canvas.
  await c.ev(`void (()=>{window.__pd=0;window.__pu=0;const cv=document.querySelector('canvas');cv.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')__pd++},true);cv.addEventListener('pointerup',e=>{if(e.pointerType==='touch')__pu++},true);cv.addEventListener('pointercancel',e=>{if(e.pointerType==='touch')__pu++},true);})()`);
  for (const [w, h, mode] of [[390, 844, 'auto'], [844, 390, 'byte'], [390, 844, 'byte'], [844, 390, 'auto']]) {
    await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;d.config.camera.drift=false;d.config.water.flowSpeed=0;d.config.wet.trickleSpeed=0;d.config.touch.precision='${mode}';d.apply();d.hidePanel();d.resetTouch();})()`);
    await sleep(500);
    for (const [label, v] of [['before', old], ['after', next]]) {
      await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;d.config.rock.color='${v.rock}';d.config.curtain.color='${v.water}';d.config.curtain.opacity=${v.opacity};d.apply();})()`);
      await sleep(250); await shot(c, `${w}x${h}-${mode}-${label}.png`);
    }
    await c.ev('void (()=>{const d=__WALDEN_DEBUG__;d.config.camera.drift=true;d.config.water.flowSpeed=1;d.config.wet.trickleSpeed=.35;d.apply()})()');
    await sleep(300);
    const pd0 = await c.ev('[__pd,__pu]');
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: w/2-25, y: h*.4 }, { id: 2, x: w/2+25, y: h*.6 }] });
    await sleep(250);
    await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: w/2-25, y: h*.4 }, { id: 2, x: w/2+45, y: h*.6 }] });
    await sleep(400);
    const held = await c.ev('({snapshot:__WALDEN_DEBUG__.snapshot().touch,field:__WALDEN_DEBUG__.inspectTouch(),pd:__pd,pu:__pu})');
    await shot(c, `${w}x${h}-${mode}-touch.png`);
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const t0 = Date.now(); let healedAt = null, healed;
    while (Date.now() - t0 < 3000) { await sleep(100); healed = await c.ev('({snapshot:__WALDEN_DEBUG__.snapshot().touch,field:__WALDEN_DEBUG__.inspectTouch(),pd:__pd,pu:__pu})'); if (healed.field.max === 0 && healedAt === null) { healedAt = Date.now() - t0; break; } }
    const ok = held.snapshot.count === 2 && held.pd - pd0[0] === 2 && held.field.max > 0.8 && healed.snapshot.count === 0 && healed.field.max === 0 && healed.pu - pd0[1] === 2;
    result.views.push({ w, h, mode, deliveredDown: held.pd - pd0[0], deliveredUp: healed.pu - pd0[1], held, healed, healedAtMs: healedAt, ok });
  }
  result.fieldLog = c.events.filter(e => e.method === 'Runtime.consoleAPICalled' && JSON.stringify(e.params.args).includes('Touch field')).map(e => e.params.args.map(a => a.value).join(' '));
  result.console = c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error','warning','warn'].includes(e.params.type)) || (e.method === 'Log.entryAdded' && ['error','warning'].includes(e.params.entry.level)));
  await writeFile(new URL('results.json', out), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ loaded: { rock: result.loadedDefaults.rock, water: result.loadedDefaults.water, op: result.loadedDefaults.opacity }, plain: result.plain, views: result.views.map(v => ({ w: v.w, h: v.h, mode: v.mode, down: v.deliveredDown, up: v.deliveredUp, count: v.held.snapshot.count, max: v.held.field.max, healedMs: v.healedAtMs, healedMax: v.healed.field.max, ok: v.ok })), fieldLog: result.fieldLog, console: result.console.length }, null, 1));
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
