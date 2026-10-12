// Reviewer probe: live app on 5175 via Edge CDP 9334. Writes into ./out.
import { connect, browserSend, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const out = new URL('./out/', import.meta.url);
const c = await connect();
await browserSend('Target.activateTarget', { targetId: c.target.id });
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' }); await sleep(3000);
const D = '__WALDEN_DEBUG__';
await c.ev(`void (() => { const d=${D};d.hidePanel();d.config.camera.drift=false;d.config.water.flowSpeed=0;d.config.wet.trickleSpeed=0;d.config.markers.opacity=0;d.apply(); })()`);
async function shot(name, code) {
  if (code) await c.ev(code); await sleep(400);
  writeFileSync(new URL(`${name}.png`, out), Buffer.from((await c.send('Page.captureScreenshot')).data, 'base64'));
}
const set = (path, v) => `${D}.config.${path}=${JSON.stringify(v)};${D}.apply()`;
await shot('wall-only', set('curtain.visible', false));
await shot('zero-offset', `${D}.config.curtain.visible=true;${D}.config.water.view='refraction';${D}.config.refraction.strength=0;${D}.apply()`);
await shot('offset', set('refraction.strength', 0.06));
await shot('uv', set('water.view', 'uv'));
await shot('water-default', `${D}.config.water.view='water';${D}.config.refraction.strength=0.018;${D}.apply()`);
await shot('water-refraction-off', set('refraction.enabled', false));
await c.ev(set('refraction.enabled', true));
// Forced byte fallback, curtain hidden and visible.
await shot('byte-wall-only', `${D}.config.refraction.precision='byte';${D}.config.curtain.visible=false;${D}.apply()`);
const byteSnap = await c.ev(`${D}.snapshot().capture`);
await shot('byte-water', set('curtain.visible', true));
await shot('auto-water', set('refraction.precision', 'auto'));
await shot('scale-half-wall', `${D}.config.refraction.scale=0.5;${D}.config.curtain.visible=false;${D}.apply()`);
const halfSnap = await c.ev(`${D}.snapshot().capture`);
await c.ev(`${D}.config.refraction.scale=1;${D}.config.curtain.visible=true;${D}.apply()`);
// Extremes for NaN: min lip speed, max normal step, zero and max gravity.
await shot('extreme-g0', `Object.assign(${D}.config.water,{lipSpeed:0.1,normalStep:0.02,gravity:0,flowSpeed:0});${D}.apply()`);
await shot('extreme-g5', `Object.assign(${D}.config.water,{gravity:5,normalStrength:3,gloss:5,glint:8});${D}.apply()`);
await c.ev(`location.reload()`); await sleep(3000);
const snapshot = await c.ev(`${D}.snapshot()`);
writeFileSync(new URL('live.json', out), JSON.stringify({ snapshot, byteSnap, halfSnap,
  console: c.events.filter(e => ['Runtime.exceptionThrown', 'Log.entryAdded', 'Runtime.consoleAPICalled'].includes(e.method)).map(e => e.params) }, null, 2));
console.log(JSON.stringify({ byteSnap, halfSnap, capture: snapshot.capture, curtain: snapshot.curtain, drawCalls: snapshot.drawCalls, triangles: snapshot.triangles }));
c.close();
