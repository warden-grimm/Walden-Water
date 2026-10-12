// r2 app-level failure/restore/extension checks (CDP 9334, preview 5175).
// window.__corrupt toggles corruption of 1x1 validation readbacks at runtime.
import { connect, browserSend, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const c = await connect(); await c.send('Runtime.enable'); await c.send('Page.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await browserSend('Target.activateTarget', { targetId: c.target.id });
const HOOK = (start, hideExt) => `window.__corrupt=${start};{const o=WebGL2RenderingContext.prototype.readPixels;
 WebGL2RenderingContext.prototype.readPixels=function(...a){o.apply(this,a);if(window.__corrupt&&a[2]===1&&a[3]===1&&ArrayBuffer.isView(a[6]))a[6].fill(7)};
 const g=WebGL2RenderingContext.prototype.getExtension;const hide=${JSON.stringify(hideExt)};
 WebGL2RenderingContext.prototype.getExtension=function(n){return hide.includes(n)?null:g.call(this,n)};
 const s=WebGL2RenderingContext.prototype.getSupportedExtensions;WebGL2RenderingContext.prototype.getSupportedExtensions=function(){return s.call(this).filter(n=>!hide.includes(n))};}`;
const logs = () => c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['warning', 'error', 'info'].includes(e.params.type)))
  .map(e => [e.params.type || 'exception', (e.params.args?.map(a => a.value ?? a.description).join(' ') || e.params.exceptionDetails?.exception?.description || '').slice(0, 160)]);
const state = async () => c.ev(`(async()=>{const d=__WALDEN_DEBUG__;const f0=d.snapshot().frames;await new Promise(r=>setTimeout(r,300));const s=d.snapshot();
  return {running:s.running,framesAdvanced:s.frames-f0,elapsed:+s.elapsed.toFixed(2),notice:!document.querySelector('#scene-error').hidden,
   enabled:d.config.touch.enabled,overlay:d.config.touch.overlay,available:s.touch.available,format:s.touch.format,reason:s.touch.disabledReason,validation:s.touch.validation,generation:s.touch.generation,textures:s.textures}})()`);
async function press() { // real mouse press in the middle of the curtain
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 720, y: 450, button: 'left', buttons: 1, clickCount: 1 }); await sleep(200);
  const r = await c.ev('({count:__WALDEN_DEBUG__.snapshot().touch.count,field:__WALDEN_DEBUG__.inspectTouch().max})');
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 720, y: 450, button: 'left', buttons: 0, clickCount: 1 }); return r; }
const restore = async () => { await c.ev('void (window.__lose=document.querySelector("canvas").getContext("webgl2").getExtension("WEBGL_lose_context")).loseContext()'); await sleep(200); await c.ev('void __lose.restoreContext()'); await sleep(1200); };
const out = {};
async function scenario(label, hook, steps) {
  c.events.length = 0; const id = hook && (await c.send('Page.addScriptToEvaluateOnNewDocument', { source: hook })).identifier;
  try { await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' }); await sleep(2000); out[label] = { start: await state() }; await steps(out[label]); out[label].console = logs(); }
  finally { if (id) await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: id }); }
}
await scenario('startupFails', HOOK(true, []), async o => {
  o.pressWhileDisabled = await press();
  await c.ev('__WALDEN_DEBUG__.config.touch.overlay=true;__WALDEN_DEBUG__.apply()'); await sleep(300); o.overlayForced = await state();
  await restore(); o.restoreStillCorrupt = await state();
  await c.ev('window.__corrupt=false'); await restore(); o.restoreHealthy = await state(); o.pressAfterHealthyRestore = await press();
  await c.ev('__WALDEN_DEBUG__.config.touch.enabled=true;__WALDEN_DEBUG__.apply()'); await sleep(300); o.explicitReenable = await state(); o.pressAfterReenable = await press();
  await c.send('Page.captureScreenshot').then(r => writeFileSync(new URL('../out/startup-fail-recovered.png', import.meta.url), Buffer.from(r.data, 'base64')));
});
await scenario('restoreOnlyFails', HOOK(false, []), async o => {
  o.pressHealthy = await press(); await c.ev('window.__corrupt=true'); await restore(); o.afterFailedRestore = await state(); o.pressAfterFailedRestore = await press();
  await c.send('Page.captureScreenshot').then(r => writeFileSync(new URL('../out/restore-fail.png', import.meta.url), Buffer.from(r.data, 'base64')));
  await c.ev('__WALDEN_DEBUG__.config.touch.width=128;__WALDEN_DEBUG__.apply()'); await sleep(300); o.sizeRetryStillCorrupt = await state();
  await c.ev('window.__corrupt=false;__WALDEN_DEBUG__.config.touch.width=256;__WALDEN_DEBUG__.apply()'); await sleep(300); o.sizeRetryHealthy = await state();
  for (let i = 0; i < 2; i++) await restore(); o.twoMoreRestores = await state();
});
await scenario('hideFloatExt', HOOK(false, ['EXT_color_buffer_float']), async o => { o.press = await press(); });
await scenario('hideBothExt', HOOK(false, ['EXT_color_buffer_float', 'EXT_color_buffer_half_float']), async o => { o.press = await press(); });
await scenario('native', null, async o => { o.press = await press(); });
writeFileSync(new URL('../out/lifefix.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await c.send('Page.navigate', { url: 'about:blank' }); c.close();
