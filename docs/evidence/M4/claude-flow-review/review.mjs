// Claude M4-r3 scratch probe: own Edge CDP 9334, own preview 5175. Not tracked.
import { connect, browserSend, sleep } from './cdp.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const out = new URL('./out/', import.meta.url); await mkdir(out, { recursive: true });
const old = { rock: '#4b555e', water: '#9cbdc6', opacity: 0.40, flowSpeed: 1 };
const next = { rock: '#48525b', water: '#a6c6ce', opacity: 0.43, flowSpeed: 1.15 };
const shot = async (c, name) => writeFile(new URL(name, out), Buffer.from((await c.send('Page.captureScreenshot')).data, 'base64'));
const set = (v, extra = '') => `void (()=>{const d=__WALDEN_DEBUG__;d.config.rock.color='${v.rock}';d.config.curtain.color='${v.water}';d.config.curtain.opacity=${v.opacity};d.config.water.flowSpeed=${v.flowSpeed};${extra}d.apply();})()`;
const result = { measuredAt: new Date().toISOString(), plain: [], frozen: [], clips: [], wake: [], holds: [] };
const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(fresh.targetId);
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
const inspect = 'Object.assign(__WALDEN_DEBUG__.inspectTouch(),{count:__WALDEN_DEBUG__.snapshot().touch.count,t:performance.now()})';
try {
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
  // 1. Production route with shipped defaults.
  for (const [w, h] of [[390, 844], [844, 390]]) {
    await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/' });
    await browserSend('Target.activateTarget', { targetId: fresh.targetId }); await sleep(2500);
    await shot(c, `plain-${w}x${h}.png`);
    result.plain.push({ w, h, gui: await c.ev('document.querySelectorAll(".lil-gui").length'), canvas: await c.ev('[document.querySelector("canvas").width, document.querySelector("canvas").height]') });
  }
  await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' }); await sleep(2500);
  result.browser = await c.ev('navigator.userAgent');
  result.loaded = await c.ev('(()=>{const d=__WALDEN_DEBUG__.config;return {rock:d.rock.color,water:d.curtain.color,opacity:d.curtain.opacity,flowSpeed:d.water.flowSpeed,transport:d.touch.transport}})()');
  // GUI controllers bound to the defaults (lil-gui number inputs / color text).
  result.gui = await c.ev(`(()=>{const r={};for(const el of document.querySelectorAll('.lil-gui .controller')){const n=el.querySelector('.name')?.textContent;if(['flowSpeed','opacity','color'].includes(n)){const i=el.querySelector('input');(r[n]=r[n]||[]).push(i?.value)}}return r})()`);
  result.pipelineDefault = await c.ev('(()=>{const s=__WALDEN_DEBUG__.snapshot();return {drawCalls:s.drawCalls,triangles:s.triangles,programs:s.programs,geometries:s.geometries,textures:s.textures}})()');
  await c.ev(`void (()=>{window.__pd=0;window.__pu=0;const cv=document.querySelector('canvas');cv.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')__pd++},true);cv.addEventListener('pointerup',e=>{if(e.pointerType==='touch')__pu++},true);cv.addEventListener('pointercancel',e=>{if(e.pointerType==='touch')__pu++},true);})()`);
  for (const [w, h, mode] of [[390, 844, 'auto'], [844, 390, 'byte'], [390, 844, 'byte'], [844, 390, 'auto']]) {
    await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;d.config.touch.precision='${mode}';d.config.camera.drift=false;d.apply();d.hidePanel();d.resetTouch();})()`);
    await sleep(500);
    const first = mode === 'auto' && w === 390 || mode === 'byte' && w === 844;
    if (first) {
      // 2. Frozen matched before/after.
      for (const [label, v] of [['before', old], ['after', next]]) {
        await c.ev(set({ ...v, flowSpeed: 0 }, 'd.config.wet.trickleSpeed=0;'));
        await sleep(300); await shot(c, `${w}x${h}-${label}.png`);
      }
      // 3. Own motion clips (drift off), 3 s each, 30 fps request.
      for (const [label, v] of [['before', old], ['after', next]]) {
        await c.ev(set(v, `d.config.wet.trickleSpeed=.35;window.__chunks=[];window.__rec=new MediaRecorder(document.querySelector('canvas').captureStream(30),{mimeType:'video/webm',videoBitsPerSecond:4000000});__rec.ondataavailable=e=>__chunks.push(e.data);__rec.start();`));
        await sleep(3000);
        const clip = await c.ev(`new Promise(resolve=>{__rec.onstop=()=>{__rec.stream.getTracks().forEach(t=>t.stop());const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(__chunks,{type:'video/webm'}));};__rec.stop();})`);
        await writeFile(new URL(`${w}x${h}-${label}.webm`, out), Buffer.from(clip, 'base64'));
        result.clips.push(`${w}x${h}-${label}.webm`);
      }
      // 4. Wake advection A/B: short tap, then track field centroid descent.
      for (const [label, v] of [['before', old], ['after', next]]) {
        await c.ev(set(v)); await c.ev('__WALDEN_DEBUG__.resetTouch()'); await sleep(200);
        await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 7, x: w / 2, y: h * .3 }] });
        await sleep(150);
        await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        const track = [];
        for (let i = 0; i < 14; i++) { const s = await c.ev(inspect); track.push({ t: s.t, v: s.centroidV, max: s.max }); if (s.max === 0) break; await sleep(60); }
        result.wake.push({ w, h, mode, label, track });
      }
    }
    // 5. Two-finger hold at new defaults: 3 s, centroid stability, release, recovery.
    await c.ev(set(next, 'd.config.camera.drift=true;d.config.wet.trickleSpeed=.35;')); await c.ev('__WALDEN_DEBUG__.resetTouch()');
    await sleep(300);
    const pd0 = await c.ev('[__pd,__pu]');
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: w / 2 - 25, y: h * .4 }, { id: 2, x: w / 2 + 25, y: h * .6 }] });
    const holdTrack = [];
    for (let i = 0; i < 6; i++) { await sleep(500); const s = await c.ev(inspect); holdTrack.push({ v: +s.centroidV?.toFixed(4), u: +s.centroidU?.toFixed(4), max: +s.max.toFixed(3), count: s.count }); }
    await shot(c, `${w}x${h}-${mode}-hold3s.png`);
    const downs = (await c.ev('__pd')) - pd0[0];
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const t0 = Date.now(); let healedMs = null, last;
    while (Date.now() - t0 < 3500) { await sleep(80); last = await c.ev(inspect); if (last.max === 0) { healedMs = Date.now() - t0; break; } }
    const ups = (await c.ev('__pu')) - pd0[1];
    result.holds.push({ w, h, mode, downs, ups, holdTrack, healedMs, healedCount: last.count, ok: downs === 2 && ups === 2 && holdTrack.every(s => s.count === 2 && s.max > .8) && last.count === 0 && last.max === 0 });
  }
  result.pipelineAfter = await c.ev('(()=>{const s=__WALDEN_DEBUG__.snapshot();return {drawCalls:s.drawCalls,triangles:s.triangles,programs:s.programs,geometries:s.geometries,textures:s.textures,touch:s.touch.format}})()');
  result.fieldLog = c.events.filter(e => e.method === 'Runtime.consoleAPICalled' && JSON.stringify(e.params.args).includes('Touch field')).map(e => e.params.args.map(a => a.value).join(' '));
  result.console = c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'warn'].includes(e.params.type)) || (e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params.entry.level)));
  await writeFile(new URL('results.json', out), JSON.stringify(result, null, 1));
  console.log(JSON.stringify({ ...result, wake: result.wake.map(x => ({ w: x.w, label: x.label, track: x.track.map(p => [Math.round(p.t - x.track[0].t), +(p.v ?? 0).toFixed(4), +p.max.toFixed(3)]) })) }, null, 1));
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
