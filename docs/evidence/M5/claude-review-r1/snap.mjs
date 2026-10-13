import { connect, browserSend, sleep } from './cdp.mjs';
const port = process.argv[2] || '5176';
const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(fresh.targetId);
try {
  await c.send('Page.enable'); await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.navigate', { url: `http://127.0.0.1:${port}/?debug` });
  await browserSend('Target.activateTarget', { targetId: fresh.targetId });
  await sleep(2500);
  console.log(JSON.stringify(await c.ev('__WALDEN_DEBUG__.snapshot()'), null, 1));
  console.log(await c.ev('Object.keys(__WALDEN_DEBUG__).join(",")'));
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
