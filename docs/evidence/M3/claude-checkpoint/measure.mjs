// Run with the dedicated Edge CDP instance on :9333 and preview on :5175.
import { connect, browserSend, sleep } from './cdp.mjs';
import { writeFile } from 'node:fs/promises';
const label = process.argv[2];
const c = await connect();
await c.send('Page.enable');
await c.send('Runtime.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' });
await browserSend('Target.activateTarget', { targetId: c.target.id });
await sleep(2000);
if (label === 'reduced') await c.ev("__WALDEN_DEBUG__.config.wall.quality = 'reduced'; __WALDEN_DEBUG__.apply()");
await c.ev('__WALDEN_DEBUG__.hidePanel(); __WALDEN_DEBUG__.sample()');
let status;
do { await sleep(1000); status = await c.ev('__WALDEN_DEBUG__.sampleStatus()'); } while (status.state === 'warming' || status.state === 'sampling');
await writeFile(new URL(`./out/${label}-timing.json`, import.meta.url), JSON.stringify({ measuredAt: new Date().toISOString(), status }, null, 2));
console.log(JSON.stringify({ label, state: status.state, count: status.count, median: status.result?.medianMs, p95: status.result?.p95Ms, costs: status.result?.renderCost }));
c.close();
