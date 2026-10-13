// Capture the scene at the old (0.045) and new (0.0225) shaft intensity, same frame time.
import { connect, browserSend, sleep } from '../../M3/cdp.mjs';
import { writeFile } from 'node:fs/promises';
const out = process.argv[2];
const t = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(t.targetId);
try {
  await c.send('Page.enable'); await c.send('Runtime.enable');
  for (const [name, w, h, dpr] of [['portrait', 390, 844, 2], ['landscape', 844, 390, 2]]) {
    await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile: true });
    await c.send('Page.navigate', { url: 'http://127.0.0.1:5174/?debug' });
    await browserSend('Target.activateTarget', { targetId: t.targetId });
    await sleep(4000);
    await c.ev(`document.querySelector('.lil-gui.lil-root')?.style.setProperty('display','none')`);
    for (const value of [0.045, 0.0225]) {
      await c.ev(`(()=>{const d=__WALDEN_DEBUG__;d.config.camera.drift=false;d.config.shaft.intensity=${value};d.apply()})()`);
      await sleep(600);
      const shot = await c.send('Page.captureScreenshot', { format: 'png' });
      await writeFile(`${out}/${name}-${value}.png`, Buffer.from(shot.data, 'base64'));
    }
  }
  console.log('ok', await c.ev('__WALDEN_DEBUG__.config.shaft.intensity'));
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: t.targetId }); }
