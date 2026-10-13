// Reviewer probe: isolate touch bursts (curtain hidden, sheen/drift/spray/dust off) and
// capture before/after frames for swipes in four directions.
import { connect, browserSend, sleep } from './cdp.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const [W, H, D, tag] = [Number(process.argv[2] || 390), Number(process.argv[3] || 844), Number(process.argv[4] || 2), process.argv[5] || 'portrait'];
const out = resolve('out', 'direction-' + tag); await mkdir(out, { recursive: true });
const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(fresh.targetId);
const shot = async name => writeFile(resolve(out, `${name}.png`), Buffer.from((await c.send('Page.captureScreenshot')).data, 'base64'));
const res = { W, H, D, swipes: [] };
try {
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: D, mobile: W < H });
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
  await c.send('Page.navigate', { url: 'http://127.0.0.1:5176/?debug' });
  await browserSend('Target.activateTarget', { targetId: fresh.targetId });
  await sleep(2500);
  await c.ev("void (()=>{const d=__WALDEN_DEBUG__;d.hidePanel();d.config.curtain.visible=false;d.config.wet.sheen=false;d.config.camera.drift=false;d.config.spray.enabled=false;d.config.dust.enabled=false;d.apply()})()");
  await sleep(800);
  const cx = W * 0.5, cy = H * 0.42, L = Math.min(W, H) * 0.22;
  const dirs = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };
  let id = 1;
  for (const [name, [dx, dy]] of Object.entries(dirs)) {
    await sleep(2200);
    await shot(`${name}-before`);
    const before = (await c.ev('__WALDEN_DEBUG__.snapshot()')).particles.bursts.emitted;
    const x0 = cx - dx * L / 2, y0 = cy - dy * L / 2;
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id, x: x0, y: y0 }] });
    for (let i = 1; i <= 8; i++) { await sleep(16); await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id, x: x0 + dx * L * i / 8, y: y0 + dy * L * i / 8 }] }); }
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(300); await shot(`${name}-300ms`);
    await sleep(2000);
    const snap = (await c.ev('__WALDEN_DEBUG__.snapshot()')).particles.bursts;
    res.swipes.push({ name, x0, y0, x1: x0 + dx * L, y1: y0 + dy * L, emitted: snap.emitted - before, liveAfter2_3s: snap.live });
    id++;
  }
  res.console = c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(e.params.type)) || (e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params.entry.level))).map(e => JSON.stringify(e.params).slice(0, 300));
  await writeFile(resolve(out, 'result.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res));
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
