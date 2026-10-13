// M7 HMR retest (pool ripple target added): repeated HMR must keep the touch field validated and the pool target allocated.
// Rewrites each module with identical bytes to trigger Vite HMR on :5174.
import { connect, browserSend, sleep } from '../M3/cdp.mjs';
import { readFile, writeFile } from 'node:fs/promises';
const files = ['src/main.js', 'src/scene/createScene.js', 'src/scene/Particles.js', 'src/scene/Pool.js'];
const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(fresh.targetId);
const rows = [];
try {
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false });
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
  for (const mode of ['auto', 'byte']) {
    await c.send('Page.navigate', { url: `http://127.0.0.1:5174/?debug&mode=${mode}` });
    await browserSend('Target.activateTarget', { targetId: fresh.targetId });
    await sleep(2500);
    for (const file of files) for (let cycle = 1; cycle <= 3; cycle++) {
      // HMR re-imports config, so the precision preference is re-applied after each cycle.
      await writeFile(file, await readFile(file));
      await sleep(2500);
      await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;d.config.touch.precision='${mode}';d.apply()})()`);
      await sleep(300);
      const before = await c.ev('__WALDEN_DEBUG__.snapshot().particles.bursts.emitted');
      await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: 500, y: 360 }] });
      for (let i = 1; i <= 8; i++) { await sleep(16); await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: 500 + 25 * i, y: 360 }] }); }
      await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await sleep(200);
      const s = await c.ev('(()=>{const s=__WALDEN_DEBUG__.snapshot();return {available:s.touch.available,format:s.touch.format,emitted:s.particles.bursts.emitted,ripples:s.pool.target?.format,geometries:s.geometries,textures:s.textures,programs:s.programs,canvases:document.querySelectorAll("canvas").length,guis:document.querySelectorAll(".lil-gui.lil-root").length}})()');
      rows.push({ mode, file, cycle, ...s, splashed: s.emitted - before });
    }
  }
  const console_ = c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'warn'].includes(e.params.type)) || (e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params.entry.level)));
  const result = { measuredAt: new Date().toISOString(), rows, console: console_.map(e => JSON.stringify(e.params).slice(0, 300)) };
  await writeFile(new URL('./hmr.json', import.meta.url), JSON.stringify(result, null, 2));
  for (const r of rows) console.log(`${r.mode} ${r.file} #${r.cycle}: available=${r.available} ${r.format} splashed=${r.splashed} geo=${r.geometries} tex=${r.textures} prog=${r.programs} canvas=${r.canvases} gui=${r.guis}`);
  console.log('console warnings/errors:', result.console.length, result.console.slice(0, 3));
  if (rows.some(r => !r.available || !r.ripples || r.splashed < 1 || r.canvases !== 1 || r.guis !== 1)) process.exitCode = 1;
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
