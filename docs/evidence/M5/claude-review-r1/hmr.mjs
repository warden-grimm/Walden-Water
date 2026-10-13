import { connect, browserSend, sleep } from './cdp.mjs';
import { utimes } from 'node:fs/promises';
const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(fresh.targetId);
const state = () => c.ev("(()=>{const s=__WALDEN_DEBUG__.snapshot();return {canvases:document.querySelectorAll('canvas').length,guis:document.querySelectorAll('.lil-gui.root').length,geometries:s.geometries,textures:s.textures,programs:s.programs,draws:s.drawCalls,bursts:s.particles.bursts.emitted,frames:s.frames}})()");
try {
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
  await c.send('Page.navigate', { url: 'http://127.0.0.1:5176/?debug' });
  await browserSend('Target.activateTarget', { targetId: fresh.targetId });
  await sleep(2500);
  const rows = [{ step: 'load', ...(await state()) }];
  for (const f of ['../src/scene/Particles.js', '../src/interaction/SplashEmitter.js', '../src/main.js']) {
    const now = new Date(); await utimes(f, now, now); await sleep(2500);
    rows.push({ step: 'hmr ' + f.split('/').pop(), ...(await state()) });
  }
  await c.ev('void __WALDEN_DEBUG__.hidePanel()');
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: 380, y: 160 }] });
  for (let i = 1; i <= 8; i++) { await sleep(16); await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: 380 + 10 * i, y: 160 }] }); }
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(200);
  rows.push({ step: 'swipe after hmr', ...(await state()) });
  console.table(rows);
  console.log(c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'debug', 'log'].includes(e.params.type)) || (e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params.entry.level))).map(e => (e.params.type || e.params.entry?.level) + ' ' + JSON.stringify(e.params.args?.map(a => a.value ?? a.description) ?? e.params.entry?.text).slice(0, 200)).join('\n'));
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
