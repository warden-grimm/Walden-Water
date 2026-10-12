// Water-only contribution: same frozen frame with curtain visible vs hidden, old vs new.
import { connect, browserSend, sleep } from './cdp.mjs';
import { writeFile } from 'node:fs/promises';
const out = new URL('./out/', import.meta.url);
const sets = { before: { rock: '#525c66', water: '#88adb7', opacity: 0.36 }, after: { rock: '#4b555e', water: '#9cbdc6', opacity: 0.40 } };
const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(fresh.targetId);
await c.send('Page.enable'); await c.send('Runtime.enable');
try {
  for (const [w, h] of [[390, 844], [844, 390]]) {
    await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' });
    await browserSend('Target.activateTarget', { targetId: fresh.targetId }); await sleep(2500);
    await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;d.config.camera.drift=false;d.config.water.flowSpeed=0;d.config.wet.trickleSpeed=0;d.apply();d.hidePanel();})()`);
    await sleep(400);
    for (const [lab, v] of Object.entries(sets)) for (const vis of [true, false]) {
      await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;d.config.rock.color='${v.rock}';d.config.curtain.color='${v.water}';d.config.curtain.opacity=${v.opacity};d.config.curtain.visible=${vis};d.apply();})()`);
      await sleep(250);
      await writeFile(new URL(`iso-${w}x${h}-${lab}-${vis ? 'water' : 'rockonly'}.png`, out), Buffer.from((await c.send('Page.captureScreenshot')).data, 'base64'));
    }
  }
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
