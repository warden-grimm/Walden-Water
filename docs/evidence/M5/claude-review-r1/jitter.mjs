import { connect, browserSend, sleep } from './cdp.mjs';
import { writeFile } from 'node:fs/promises';
const out = [];
for (const [W, H] of (process.argv[2]==="p"?[[390, 844]]:[[390, 844], [844, 390]])) {
  const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
  const c = await connect(fresh.targetId);
  try {
    await c.send('Page.enable'); await c.send('Runtime.enable');
    await c.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
    await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
    await c.send('Page.navigate', { url: 'http://127.0.0.1:5176/?debug' });
    await browserSend('Target.activateTarget', { targetId: fresh.targetId });
    await sleep(2500);
    await c.ev("void __WALDEN_DEBUG__.hidePanel()");
    // count delivered pointermoves to report the real event rate
    await c.ev("window.__moves=0;document.querySelector('canvas').addEventListener('pointermove',()=>__moves++)");
    let id = 1;
    for (const amp of [0, 0.25, 0.5, 1, 2]) {
      const e0 = (await c.ev('__WALDEN_DEBUG__.snapshot()')).particles.bursts.emitted;
      await c.ev('__moves=0');
      const x = W / 2, y = H * 0.4, t0 = Date.now();
      await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id, x, y }] });
      while (Date.now() - t0 < 3000) { await sleep(16); await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id, x: x + (Math.random() * 2 - 1) * amp, y: y + (Math.random() * 2 - 1) * amp }] }); }
      const s = await c.ev('__WALDEN_DEBUG__.snapshot()');
      await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      out.push({ viewport: `${W}x${H}`, jitterCssPx: amp, seconds: (Date.now() - t0) / 1000, moves: await c.ev('__moves'), contacts: s.touch.count, burstsEmitted: s.particles.bursts.emitted - e0 });
      id++; await sleep(1800);
    }
  } finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
}
console.table(out);
await writeFile('out/jitter-'+(process.argv[2]||'all')+'.json', JSON.stringify(out, null, 1));
