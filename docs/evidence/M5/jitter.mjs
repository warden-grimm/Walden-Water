// M5 r1 nit retest: a held finger with ±1/±2 px jitter at 60 Hz for 3 s.
import { connect, browserSend, sleep } from '../M3/cdp.mjs';
import { writeFile } from 'node:fs/promises';
const rows = [];
for (const [width, height] of (process.argv[2] === "portrait" ? [[390, 844]] : process.argv[2] === "landscape" ? [[844, 390]] : [[844, 390], [390, 844]])) for (const amp of [1, 2]) {
  const f = await browserSend('Target.createTarget', { url: 'about:blank' }); const c = await connect(f.targetId);
  try {
    await c.send('Page.enable'); await c.send('Runtime.enable');
    await c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });
    await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
    await c.send('Page.navigate', { url: 'http://127.0.0.1:5174/?debug' }); await browserSend('Target.activateTarget', { targetId: f.targetId }); await sleep(2500);
    await c.ev('void __WALDEN_DEBUG__.hidePanel()'); // The GUI covers this point at phone widths.
    const x = width / 2, y = height * 0.4;
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] });
    for (let i = 0; i < 180; i++) { await sleep(16); await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: x + (i % 2 ? amp : -amp), y: y + (i % 3 - 1) * amp }] }); }
    const s = await c.ev('__WALDEN_DEBUG__.snapshot()');
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    rows.push({ width, height, amplitudePx: amp, contacts: s.touch.count, emitted: s.particles.bursts.emitted });
  } finally { c.close(); await browserSend('Target.closeTarget', { targetId: f.targetId }); }
}
await writeFile(new URL('./jitter.json', import.meta.url), JSON.stringify({ measuredAt: new Date().toISOString(), rows }, null, 2));
console.log(rows);
