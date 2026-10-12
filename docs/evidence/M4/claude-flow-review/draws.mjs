import { connect, browserSend, sleep } from './cdp.mjs';
const f = await browserSend('Target.createTarget', { url: 'about:blank' }); const c = await connect(f.targetId);
await c.send('Runtime.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' }); await browserSend('Target.activateTarget', { targetId: f.targetId }); await sleep(2500);
const snap = () => c.ev('(()=>{const s=__WALDEN_DEBUG__.snapshot();return [s.drawCalls,s.triangles,s.programs]})()');
const r = { idle: await snap() };
for (const [name, v] of [['old', { rock: '#4b555e', water: '#9cbdc6', opacity: 0.40, flowSpeed: 1 }], ['new', { rock: '#48525b', water: '#a6c6ce', opacity: 0.43, flowSpeed: 1.15 }]]) {
  await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;d.config.rock.color='${v.rock}';d.config.curtain.color='${v.water}';d.config.curtain.opacity=${v.opacity};d.config.water.flowSpeed=${v.flowSpeed};d.apply()})()`);
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: 195, y: 340 }] }); await sleep(400);
  r[name + 'Touching'] = await snap();
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(2500);
  r[name + 'Settled'] = await snap();
}
console.log(JSON.stringify(r));
c.close(); await browserSend('Target.closeTarget', { targetId: f.targetId });
