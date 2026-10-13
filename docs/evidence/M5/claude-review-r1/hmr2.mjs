// usage: node hmr2.mjs <port> <srcRoot> <file...>
import { connect, browserSend, sleep } from './cdp.mjs';
import { utimes } from 'node:fs/promises';
const [port, root, ...files] = process.argv.slice(2);
const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(fresh.targetId);
const state = () => c.ev("(()=>{const s=__WALDEN_DEBUG__.snapshot();return {canvases:document.querySelectorAll('canvas').length,geometries:s.geometries,textures:s.textures,programs:s.programs,draws:s.drawCalls,touch:s.touch.available,frames:s.frames,running:s.running}})()");
try {
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await c.send('Page.navigate', { url: `http://127.0.0.1:${port}/?debug` });
  await browserSend('Target.activateTarget', { targetId: fresh.targetId });
  await sleep(2500);
  const rows = [{ step: 'load', ...(await state()) }];
  for (const f of files) {
    const now = new Date(); await utimes(root + '/' + f, now, now); await sleep(1500);
    rows.push({ step: 'hmr ' + f, ...(await state()) }); await sleep(1500);
    rows.push({ step: '+1.5s', ...(await state()) });
  }
  console.table(rows);
  console.log(c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'info'].includes(e.params.type))).map(e => (e.params.type || 'exc') + ' ' + JSON.stringify(e.params.args?.map(a => a.value ?? a.description) ?? e.params.exceptionDetails?.exception?.description).slice(0, 250)).join('\n'));
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
