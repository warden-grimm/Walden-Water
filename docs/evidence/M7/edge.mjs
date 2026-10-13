// M7 r1 blocker retest (reviewer's reproduction, port 5174): fast right swipe low on the right half; ripple and pool views. node edge.mjs <out> <w> <h> <dpr>
import { connect, browserSend, sleep } from '../M3/cdp.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const [out, W, H, D] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const w = +W, h = +H;
const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(fresh.targetId);
const shot = async name => { const s = await c.send('Page.captureScreenshot', { format: 'png' }); await writeFile(`${out}/${name}.png`, Buffer.from(s.data, 'base64')); };
const set = s => c.ev(`void (()=>{const d=__WALDEN_DEBUG__;for(const [k,v] of Object.entries(${JSON.stringify(s)})){const [g,key]=k.split('.');d.config[g][key]=v;}d.apply()})()`);
async function swipe(y, x0, x1, n = 8, dt = 12) {
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: x0, y }] });
  for (let i = 1; i <= n; i++) { await sleep(dt); await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: Math.round(x0 + (x1 - x0) * i / n), y }] }); }
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
try {
  await c.send('Page.enable'); await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: +D, mobile: w < 900 });
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
  await c.send('Page.navigate', { url: 'http://127.0.0.1:5174/?debug' });
  await browserSend('Target.activateTarget', { targetId: fresh.targetId });
  await sleep(4000);
  await c.ev('void __WALDEN_DEBUG__.hidePanel()');
  await set({ 'camera.drift': false, 'markers.opacity': 1 }); await sleep(500);
  for (const view of ['ripples', 'pool']) {
    await set({ 'pool.view': view }); await sleep(1500);
    // fast swipe toward the right, on the right half of the curtain, low
    await swipe(Math.round(h * 0.75), Math.round(w * 0.52), Math.round(w * 0.62));
    for (const ms of [500, 750, 1000]) { await sleep(250); await shot(`${view}-${ms}`); }
  }
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
