// Adapted from docs/evidence/M2/measure.mjs: Edge :9334, explicit port/viewport.
// Usage: node measure.mjs <label> <port> <width> <height> <dpr> [reduced] [contextCycles]
import { connect, browserSend, sleep } from './cdp.mjs';
import { writeFile } from 'node:fs/promises';
const [label, port, width, height, dpr, quality = 'reference', cycles = '0'] = process.argv.slice(2);
const c = await connect();
await c.send('Page.enable'); await c.send('Runtime.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: +width, height: +height, deviceScaleFactor: +dpr, mobile: false });
await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
await c.send('Page.navigate', { url: `http://127.0.0.1:${port}/?debug` });
await browserSend('Target.activateTarget', { targetId: c.target.id });
await sleep(2000);
if (quality === 'reduced') await c.ev("__WALDEN_DEBUG__.config.wall.quality = 'reduced'; __WALDEN_DEBUG__.apply()");
for (let i = 0; i < +cycles; i++) { await c.ev('__WALDEN_DEBUG__.loseContext()'); await sleep(500); await c.ev('__WALDEN_DEBUG__.restoreContext()'); await sleep(1000); }
await c.ev('__WALDEN_DEBUG__.hidePanel(); __WALDEN_DEBUG__.sample()');
let status;
do { await sleep(1000); status = await c.ev('__WALDEN_DEBUG__.sampleStatus()'); } while (status.state === 'warming' || status.state === 'sampling');
await writeFile(new URL(`./${label}-timing.json`, import.meta.url), JSON.stringify({ measuredAt: new Date().toISOString(), args: process.argv.slice(2), status }, null, 2));
const r = status.result;
console.log(JSON.stringify({ label, state: status.state, reason: status.reason, count: status.count, median: r?.medianMs, p95: r?.p95Ms, buffer: r?.buffer, tri: r?.triangles, restores: r?.restores, gpu: r?.renderCost?.gpu, cpu: r?.renderCost?.cpuSubmit, gpuInvalid: r?.renderCost?.gpuInvalid }));
c.close();
