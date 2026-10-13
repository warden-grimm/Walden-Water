// Checkpoint r1 blocker retest: the shaft alone (curtain hidden, black rock,
// no bounce/sheen/background) must show no step across the curtain outline.
// usage: node seam.mjs <outDir>; analyse with seam.py
import { connect, browserSend, sleep } from '../M3/cdp.mjs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const out = resolve(process.argv[2] || 'docs/evidence/M6/seam');
const f = await browserSend('Target.createTarget', { url: 'about:blank' }); const c = await connect(f.targetId);
const set = async js => { await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;${js};d.apply()})()`); await sleep(500); };
try {
  await c.send('Page.enable'); await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.navigate', { url: 'http://127.0.0.1:5174/?debug' }); await browserSend('Target.activateTarget', { targetId: f.targetId }); await sleep(2500);
  await set("d.hidePanel();d.config.camera.drift=false;d.config.curtain.visible=false;d.config.rock.color='#000000';d.config.light.bounce=0;d.config.wet.sheen=false;d.config.renderer.background='#000000';d.config.spray.enabled=false;d.config.bursts.enabled=false;d.config.dust.enabled=false;d.config.shaft.noise=0;d.config.shaft.streaks=0");
  for (const intensity of [0.05, 0.15, 0.6]) {
    await set(`d.config.shaft.intensity=${intensity}`);
    await writeFile(resolve(out, `shaft-only-${intensity}.png`), Buffer.from((await c.send('Page.captureScreenshot')).data, 'base64'));
  }
  const snap = await c.ev('__WALDEN_DEBUG__.snapshot()');
  // Project the curtain's lip corners for the analysis script.
  await writeFile(resolve(out, 'seam.json'), JSON.stringify({ measuredAt: new Date().toISOString(), camera: snap.camera, curtain: { width: 2.8, height: 6 } }, null, 2));
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: f.targetId }); }
