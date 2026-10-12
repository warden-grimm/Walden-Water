// Trickle direction: slow speed so per-interval shift << half the 2π/trickleFrequency period.
import { connect, browserSend, sleep } from './cdp.mjs';
import { decodePng } from './png.mjs';
import { writeFile } from 'node:fs/promises';
const c = await connect(); await c.send('Page.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' }); await sleep(2000);
await browserSend('Target.activateTarget', { targetId: c.target.id });
await c.ev("void (()=>{const d=__WALDEN_DEBUG__; d.hidePanel(); Object.assign(d.config.camera,{drift:false}); d.config.curtain.opacity=0; d.config.wall.view='wet mask'; d.config.wet.trickleSpeed=0.05; d.config.wet.trickleContrast=1; d.apply();})()");
await sleep(500);
const grab = async n => { const s = await c.send('Page.captureScreenshot'); const b = Buffer.from(s.data, 'base64'); await writeFile(new URL(n + '.png', import.meta.url), b); return [decodePng(b), await c.ev('__WALDEN_DEBUG__.snapshot().elapsed')]; };
const [a, ta] = await grab('trickle-slow-a'); await sleep(1500); const [b, tb] = await grab('trickle-slow-b');
const res = [];
for (const x0 of [600, 700, 800]) {
  const col = img => { const v = []; for (let y = 0; y < img.height; y++) { let s = 0; for (let x = x0; x < x0 + 40; x++) s += img.data[(y * img.width + x) * img.bpp]; v.push(s); } return v; };
  const ca = col(a), cb = col(b); const mean = v => v.reduce((p, q) => p + q, 0) / v.length; const ma = mean(ca), mb = mean(cb);
  let best = 0, bs = -Infinity; for (let d = -30; d <= 30; d++) { let s = 0; for (let y = 100; y < 800; y++) s += (ca[y] - ma) * (cb[y + d] - mb); if (s > bs) { bs = s; best = d; } }
  res.push(best);
}
console.log(JSON.stringify({ elapsedDelta: tb - ta, shiftsPx: res, note: 'positive=down screen' }));
await c.ev("void (()=>{const d=__WALDEN_DEBUG__; d.config.wet.trickleSpeed=0.35; d.config.wet.trickleContrast=0.85; d.config.wall.view='rock'; d.config.camera.drift=true; d.config.curtain.opacity=0.28; d.apply();})()");
c.close();
