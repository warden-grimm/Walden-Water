// Carried M3 nit (due M8): HMR after a context restore. Forces a context
// loss/restore, then rewrites a module with identical bytes (Vite HMR on :5174)
// and records console warnings and the page state afterwards.
import { connect, browserSend, sleep } from '../M3/cdp.mjs';
import { readFile, writeFile } from 'node:fs/promises';
const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(fresh.targetId);
const rows = [];
try {
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.navigate', { url: 'http://127.0.0.1:5174/?debug' });
  await browserSend('Target.activateTarget', { targetId: fresh.targetId });
  await sleep(3000);
  for (const file of ['src/main.js', 'src/scene/createScene.js']) {
    await c.ev('void __WALDEN_DEBUG__.loseContext()'); await sleep(800);
    await c.ev('void __WALDEN_DEBUG__.restoreContext()'); await sleep(2000);
    const mark = c.events.length;
    await writeFile(file, await readFile(file));
    await sleep(4000);
    const warnings = c.events.slice(mark).filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'warn'].includes(e.params.type)) || (e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params.entry.level)));
    const state = await c.ev('(()=>{const s=__WALDEN_DEBUG__.snapshot();return {running:s.running,restores:s.restores,post:s.post.active,touch:s.touch.available,canvases:document.querySelectorAll("canvas").length,guis:document.querySelectorAll(".lil-gui.lil-root").length}})()');
    rows.push({ file, warnings: warnings.length, sample: warnings.slice(0, 2).map(e => JSON.stringify(e.params).slice(0, 200)), ...state });
  }
  await writeFile(new URL('./hmr-restore.json', import.meta.url), JSON.stringify({ measuredAt: new Date().toISOString(), rows }, null, 2));
  for (const r of rows) console.log(JSON.stringify(r));
  if (rows.some(r => r.warnings || !r.running || r.canvases !== 1 || r.guis !== 1)) process.exitCode = 1;
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
