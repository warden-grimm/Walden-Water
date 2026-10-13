import { connect, browserSend, sleep } from './cdp.mjs';
import { utimes } from 'node:fs/promises';
const variants = { none: '', noParticles: "d.config.spray.enabled=false;d.config.bursts.enabled=false;d.config.dust.enabled=false;", onlySpray: "d.config.bursts.enabled=false;d.config.dust.enabled=false;", onlyBursts: "d.config.spray.enabled=false;d.config.dust.enabled=false;", onlyMotes: "d.config.spray.enabled=false;d.config.bursts.enabled=false;" };
for (const [name, js] of Object.entries(variants)) {
  const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
  const c = await connect(fresh.targetId);
  try {
    await c.send('Page.enable'); await c.send('Runtime.enable');
    await c.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
    await c.send('Page.navigate', { url: 'http://127.0.0.1:5176/?debug' });
    await browserSend('Target.activateTarget', { targetId: fresh.targetId });
    await sleep(2500);
    await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;${js}d.apply()})()`); await sleep(500);
    const now = new Date(); await utimes('../src/scene/createScene.js', now, now); await sleep(2000);
    const s = await c.ev('__WALDEN_DEBUG__.snapshot()');
    console.log(name.padEnd(12), 'touch.available=', s.touch.available, 'reason=', s.touch.disabledReason, 'validation=', s.touch.validation, 'draws=', s.drawCalls);
  } finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
}
