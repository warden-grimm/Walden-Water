import { connect, browserSend, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const out = new URL('./out/', import.meta.url);
const c = await connect();
await browserSend('Target.activateTarget', { targetId: c.target.id });
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
const D = '__WALDEN_DEBUG__', res = {};
const shot = async name => writeFileSync(new URL(`${name}.png`, out), Buffer.from((await c.send('Page.captureScreenshot')).data, 'base64'));
const snap = () => c.ev(`(({viewport,buffer,dpr,capture,drawCalls,triangles,restores,running,contextLost})=>({viewport,buffer,dpr,capture,drawCalls,triangles,restores,running,contextLost}))(${D}.snapshot())`);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' }); await sleep(3000);
await c.ev(`void ${D}.hidePanel()`);
for (const [label, m] of Object.entries({ portrait: { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, landscape: { width: 844, height: 390, deviceScaleFactor: 3, mobile: true }, desktopDpr2: { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false }, desktop: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false } })) {
  await c.send('Emulation.setDeviceMetricsOverride', m); await sleep(1200);
  res[label] = await snap(); await shot(`life-${label}`);
}
await c.ev(`${D}.config.camera.drift=false;${D}.config.water.flowSpeed=0;${D}.config.wet.trickleSpeed=0;void ${D}.apply()`); await sleep(500);
await shot('life-before-loss'); res.beforeLoss = await snap();
for (let i = 0; i < 3; i++) { await c.ev(`void ${D}.loseContext()`); await sleep(800); await c.ev(`void ${D}.restoreContext()`); await sleep(1500); }
await sleep(500); res.afterRestore = await snap(); await shot('life-after-restore');
// Forced byte across a context cycle
await c.ev(`${D}.config.refraction.precision='byte';void ${D}.apply()`); await c.ev(`void ${D}.loseContext()`); await sleep(800); await c.ev(`void ${D}.restoreContext()`); await sleep(1500);
res.byteAfterRestore = await snap();
await c.ev(`${D}.config.refraction.precision='auto';void ${D}.apply()`); await sleep(300);
res.console = c.events.filter(e => ['Runtime.exceptionThrown', 'Log.entryAdded', 'Runtime.consoleAPICalled'].includes(e.method)).map(e => e.method === 'Runtime.consoleAPICalled' ? { type: e.params.type, text: e.params.args.map(a => a.value ?? a.description).join(' ') } : e.method === 'Log.entryAdded' ? { level: e.params.entry.level, text: e.params.entry.text } : { exception: e.params.exceptionDetails.text });
writeFileSync(new URL('life.json', out), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1)); c.close();
