import { connect, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const c = await connect(); await c.send('Runtime.enable'); await c.send('Page.enable');
const mouse = (type, x, y, buttons = 1) => c.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons, clickCount: type === 'mouseMoved' ? 0 : 1 });
await c.send('Emulation.setTouchEmulationEnabled', { enabled: false });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' }); await sleep(1800);
await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;d.config.touch.overlay=true;d.apply();d.hidePanel();
 window.__log=[];let f=0;(function t(){f++;requestAnimationFrame(t)})();
 for(const k of ['pointerdown','pointerup','lostpointercapture','gotpointercapture'])document.querySelector('canvas').addEventListener(k,e=>__log.push([k,e.pointerId,f]),true)})()`);
const out = {};
// control: press, release, 150ms gap, press
await mouse('mousePressed', 700, 450); await mouse('mouseReleased', 700, 450, 0); await sleep(150); await mouse('mousePressed', 700, 450); await sleep(300);
out.control = { count: await c.ev('__WALDEN_DEBUG__.snapshot().touch.count'), log: await c.ev('__log.splice(0)') };
await mouse('mouseReleased', 700, 450, 0); await sleep(1500);
// rapid: same, without waiting (likely within one frame)
await Promise.all([mouse('mousePressed', 700, 450), mouse('mouseReleased', 700, 450, 0), mouse('mousePressed', 700, 450)]); await sleep(300);
out.rapid = { count: await c.ev('__WALDEN_DEBUG__.snapshot().touch.count'), pointers: await c.ev('__WALDEN_DEBUG__.snapshot().touch.pointers'), log: await c.ev('__log.splice(0)') };
await mouse('mouseMoved', 720, 470); await sleep(200);
out.rapidAfterMove = await c.ev('__WALDEN_DEBUG__.snapshot().touch.count');
await mouse('mouseReleased', 720, 470, 0); await sleep(1500);
// resize while held at a point that stays on the curtain
await mouse('mousePressed', 450, 450); await sleep(300);
out.beforeResize = await c.ev('__WALDEN_DEBUG__.snapshot().touch.pointers');
await c.send('Emulation.setDeviceMetricsOverride', { width: 900, height: 1300, deviceScaleFactor: 1, mobile: false }); await sleep(600);
out.afterResize = await c.ev('__WALDEN_DEBUG__.snapshot().touch.pointers');
writeFileSync('../out/resize-held.png', Buffer.from((await c.send('Page.captureScreenshot')).data, 'base64'));
await mouse('mouseReleased', 450, 450, 0);
writeFileSync('../out/repress-resize.json', JSON.stringify(out, null, 1)); console.log(JSON.stringify(out));
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
c.close();
