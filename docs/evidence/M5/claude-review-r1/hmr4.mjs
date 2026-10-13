import { connect, browserSend, sleep } from './cdp.mjs';
import { utimes } from 'node:fs/promises';
const port = process.argv[2], root = process.argv[3];
const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(fresh.targetId);
try {
  await c.send('Page.enable'); await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
  await c.send('Page.navigate', { url: `http://127.0.0.1:${port}/?debug` });
  await browserSend('Target.activateTarget', { targetId: fresh.targetId });
  await sleep(2500);
  await c.ev(`void (()=>{window.__reads=[];const p=WebGL2RenderingContext.prototype,orig=p.readPixels;p.readPixels=function(...a){__reads.push({blend:this.isEnabled(this.BLEND),src:this.getParameter(this.BLEND_SRC_RGB),dst:this.getParameter(this.BLEND_DST_RGB),px:a[6]&&Array.from(a[6].slice?a[6].slice(0,4):[])});const r=orig.apply(this,a);__reads[__reads.length-1].after=a[6]&&Array.from(a[6].slice(0,4));return r;}})()`);
  const now = new Date(); await utimes(root + '/src/scene/createScene.js', now, now); await sleep(2000);
  const s = await c.ev('__WALDEN_DEBUG__.snapshot()');
  console.log('port', port, 'touch.available', s.touch.available, JSON.stringify(await c.ev('__reads')));
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
