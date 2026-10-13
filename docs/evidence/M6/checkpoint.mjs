// M6 early checkpoint: depth source/linearisation/segment/split views and the
// beam at raised intensity. usage: node checkpoint.mjs <outDir> <w> <h> <dpr> [port]
import { connect, browserSend, sleep } from '../M3/cdp.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const [outArg, w = 1440, h = 900, dpr = 1, port = 5174] = process.argv.slice(2);
const out = resolve(outArg); await mkdir(out, { recursive: true });
const [width, height, scale] = [w, h, dpr].map(Number);
const f = await browserSend('Target.createTarget', { url: 'about:blank' }); const c = await connect(f.targetId);
const shot = async n => writeFile(resolve(out, `${n}.png`), Buffer.from((await c.send('Page.captureScreenshot')).data, 'base64'));
const set = async js => { await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;${js};d.apply()})()`); await sleep(400); };
try {
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: width < height });
  await c.send('Page.navigate', { url: `http://127.0.0.1:${port}/?debug` }); await browserSend('Target.activateTarget', { targetId: f.targetId }); await sleep(2500);
  await set('d.hidePanel()');
  await shot('final');
  for (const view of ['depth', 'segment', 'split']) { await set(`d.config.shaft.view='${view}'`); await shot(`view-${view}`); }
  await set("d.config.shaft.view='shaft';d.config.shaft.intensity=0.6"); await shot('raised');
  await set('d.config.shaft.noise=0;d.config.shaft.streaks=0'); await shot('raised-smooth');
  await set('d.config.shaft.enabled=false'); await shot('shaft-off');
  const snap = await c.ev('__WALDEN_DEBUG__.snapshot()');
  const issues = c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'warn'].includes(e.params.type)) || (e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params.entry.level)));
  await writeFile(resolve(out, 'checkpoint.json'), JSON.stringify({ measuredAt: new Date().toISOString(), width, height, dpr: scale, snapshot: snap, console: issues.map(e => JSON.stringify(e.params).slice(0, 400)) }, null, 2));
  console.log(JSON.stringify({ shaft: snap.shaft, capture: snap.capture, draws: snap.drawCalls, console: issues.map(e => JSON.stringify(e.params).slice(0, 300)) }));
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: f.targetId }); }
