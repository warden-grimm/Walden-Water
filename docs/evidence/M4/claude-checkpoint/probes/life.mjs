import { connect, browserSend, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const c = await connect(); await c.send('Runtime.enable'); await c.send('Page.enable'); await c.send('Log.enable'); c.events.length = 0;
const out = {};
const snap = () => c.ev('(()=>{const s=__WALDEN_DEBUG__.snapshot();return {count:s.touch.count,pointers:s.touch.pointers,format:s.touch.format,gen:s.touch.generation,res:[s.geometries,s.textures,s.programs],restores:s.restores,running:s.running,field:__WALDEN_DEBUG__.inspectTouch()}})()');
const mouse = (type, x, y, buttons = 1) => c.send('Input.dispatchMouseEvent', { type, x, y, button: buttons || type === 'mouseReleased' ? 'left' : 'none', buttons, clickCount: type === 'mouseMoved' ? 0 : 1 });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' }); await sleep(1800);
await c.ev('void (()=>{const d=__WALDEN_DEBUG__;d.config.touch.overlay=true;d.apply();d.hidePanel()})()');
// 1. Two touches, move one, end one, cancel other
await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: 640, y: 300 }, { id: 2, x: 800, y: 600 }] }); await sleep(250);
out.twoDown = await snap();
await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: 640, y: 300 }, { id: 2, x: 830, y: 560 }] }); await sleep(100);
out.twoMoved = (await snap()).pointers;
await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ id: 2, x: 830, y: 560 }] }); await sleep(100);
out.oneLeft = (await snap()).pointers;
await c.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await sleep(100);
out.afterCancel = (await snap()).count; await sleep(2000);
// 2. Hidden tab (real visibility + blur) while mouse held, then return
await mouse('mousePressed', 720, 400); await sleep(200);
const other = await browserSend('Target.createTarget', { url: 'about:blank' }); await sleep(600);
out.hiddenRunning = await c.ev('({hidden:document.hidden})');
await browserSend('Target.activateTarget', { targetId: c.target.id }); await browserSend('Target.closeTarget', { targetId: other.targetId }); await sleep(600);
await mouse('mouseMoved', 740, 420); await sleep(150);
out.afterReturnHeldMouse = (await snap()).count;
await mouse('mouseReleased', 740, 420, 0); await sleep(1800);
// 3. Rapid same-id re-press within ~one frame (mouse pointerId reused)
await Promise.all([mouse('mousePressed', 700, 450), mouse('mouseReleased', 700, 450, 0), mouse('mousePressed', 700, 450)]); await sleep(400);
out.rapidRepressHeld = (await snap()).count;
await mouse('mouseReleased', 700, 450, 0); await sleep(1800);
// 4. Resize/orientation while held
await mouse('mousePressed', 720, 450); await sleep(200);
await c.send('Emulation.setDeviceMetricsOverride', { width: 900, height: 1300, deviceScaleFactor: 1, mobile: false }); await sleep(500);
out.resizeHeld = (await snap()).pointers;
writeFileSync('../out/life-resize-held.png', Buffer.from((await c.send('Page.captureScreenshot')).data, 'base64'));
await mouse('mouseReleased', 720, 450, 0); await sleep(300);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }); await sleep(1800);
// 5. Byte mode, held contact during context loss/restore; then rebuild churn
await c.ev("void (()=>{const d=__WALDEN_DEBUG__;d.config.touch.precision='byte';d.apply()})()"); await sleep(200);
await mouse('mousePressed', 720, 400); await sleep(200);
await c.ev('void __WALDEN_DEBUG__.loseContext()'); await sleep(300);
out.lostCount = (await c.ev('__WALDEN_DEBUG__.snapshot().touch.count'));
await c.ev('void __WALDEN_DEBUG__.restoreContext()'); await sleep(1000);
await mouse('mouseMoved', 730, 410); await sleep(150);
out.afterRestore = await snap();
await mouse('mouseReleased', 730, 410, 0); await sleep(1800);
out.afterRestoreNeutral = (await snap()).field;
for (const [w, h, p] of [[128, 256, 'auto'], [512, 1024, 'byte'], [256, 512, 'auto']]) { await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;Object.assign(d.config.touch,{width:${w},height:${h},precision:'${p}'});d.apply()})()`); await sleep(150); }
await c.ev('void __WALDEN_DEBUG__.loseContext()'); await sleep(300); await c.ev('void __WALDEN_DEBUG__.restoreContext()'); await sleep(1000);
out.final = await snap();
out.console = c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'info'].includes(e.params.type)) || e.method === 'Log.entryAdded').map(e => [e.params.type || e.params.entry?.level, e.params.args?.map(a => a.value).join(' ') || e.params.entry?.text || e.params.exceptionDetails?.exception?.description]);
writeFileSync('../out/lifecycle.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify({ twoDown: out.twoDown.pointers, twoMoved: out.twoMoved, oneLeft: out.oneLeft, afterCancel: out.afterCancel, hidden: out.hiddenRunning, afterReturnHeldMouse: out.afterReturnHeldMouse, rapidRepressHeld: out.rapidRepressHeld, resizeHeld: out.resizeHeld, lostCount: out.lostCount, afterRestore: { count: out.afterRestore.count, format: out.afterRestore.format, res: out.afterRestore.res }, afterRestoreNeutral: out.afterRestoreNeutral, final: { format: out.final.format, res: out.final.res, restores: out.final.restores, field: out.final.field }, console: out.console }, null, 1));
c.close();
