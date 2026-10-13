// Portrait close-ups of the press splash and a drag. usage: node shots.mjs <outDir>
import { connect, browserSend, sleep } from '../../M3/cdp.mjs';
import { writeFile } from 'node:fs/promises';
const out = process.argv[2];
const f = await browserSend('Target.createTarget', { url: 'about:blank' }); const c = await connect(f.targetId);
const shot = async n => writeFile(`${out}/${n}.png`, Buffer.from((await c.send('Page.captureScreenshot')).data, 'base64'));
try {
  await c.send('Page.enable'); await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
  await c.send('Page.navigate', { url: 'http://127.0.0.1:5174/?debug' }); await browserSend('Target.activateTarget', { targetId: f.targetId }); await sleep(2500);
  await c.ev('void (()=>{const d=__WALDEN_DEBUG__;d.hidePanel();d.config.camera.drift=false;d.apply()})()');
  // Press and hold: the single press splash from the upstream rim.
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: 195, y: 420 }] });
  await sleep(120); await shot('press-120ms'); await sleep(150); await shot('press-270ms');
  await sleep(1500); await shot('held');
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(1800);
  // Slow-medium downward-right drag.
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 2, x: 120, y: 330 }] });
  for (let i = 1; i <= 20; i++) { await sleep(16); await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 2, x: 120 + 7 * i, y: 330 + 2 * i }] }); }
  await sleep(100); await shot('drag');
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  console.log(JSON.stringify((await c.ev('__WALDEN_DEBUG__.snapshot()')).particles.bursts));
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: f.targetId }); }
