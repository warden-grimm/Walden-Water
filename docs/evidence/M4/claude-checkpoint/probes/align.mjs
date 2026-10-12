// Overlay alignment: hold a pointer, screenshot, locate the green (pressure) peak vs. the pointer.
import { connect, sleep } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('../out/align', { recursive: true });
const c = await connect(); await c.send('Runtime.enable'); await c.send('Page.enable'); await c.send('Log.enable'); c.events.length = 0;
const results = [];
async function setup(w, h, dpr, mobile) {
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile });
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 5 });
  await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' }); await sleep(1800);
  await c.ev('void (()=>{const d=__WALDEN_DEBUG__;d.config.touch.overlay=true;d.apply();d.hidePanel()})()'); await sleep(200);
}
async function press(kind, x, y, type) {
  if (kind === 'mouse') return c.send('Input.dispatchMouseEvent', { type: type === 'down' ? 'mousePressed' : 'mouseReleased', x, y, button: 'left', buttons: type === 'down' ? 1 : 0, clickCount: 1 });
  return c.send('Input.dispatchTouchEvent', { type: type === 'down' ? 'touchStart' : 'touchEnd', touchPoints: type === 'down' ? [{ id: 1, x, y }] : [] });
}
async function probe(label, kind, w, h, dpr, mobile, points) {
  await setup(w, h, dpr, mobile);
  for (const [fx, fy] of points) {
    const x = Math.round(w * fx), y = Math.round(h * fy);
    await press(kind, x, y, 'down'); await sleep(400);
    const snap = await c.ev('__WALDEN_DEBUG__.snapshot()');
    const shot = (await c.send('Page.captureScreenshot', { format: 'png' })).data;
    const file = `../out/align/${label}-${fx}-${fy}.png`; writeFileSync(file, Buffer.from(shot, 'base64'));
    await press(kind, x, y, 'up'); await sleep(1700);
    results.push({ label, kind, w, h, dpr, x, y, file, valid: snap.touch.pointers[0]?.valid ?? false, uv: snap.touch.pointers[0]?.uv, camera: snap.camera, drift: true });
  }
}
await probe('desk', 'mouse', 1440, 900, 1, false, [[0.5, 0.5], [0.5, 0.12], [0.5, 0.9], [0.42, 0.2], [0.58, 0.8], [0.45, 0.5], [0.55, 0.3]]);
await probe('portrait', 'touch', 390, 844, 3, true, [[0.5, 0.5], [0.15, 0.2], [0.85, 0.2], [0.15, 0.8], [0.85, 0.8], [0.5, 0.1]]);
await probe('landscape', 'touch', 844, 390, 3, true, [[0.5, 0.5], [0.4, 0.15], [0.6, 0.85]]);
results.console = c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(e.params.type))).length;
writeFileSync('../out/align/results.json', JSON.stringify({ results, consoleErrorsWarnings: results.console }, null, 1));
console.log('done', results.length, 'errors/warnings', results.console);
c.close();
