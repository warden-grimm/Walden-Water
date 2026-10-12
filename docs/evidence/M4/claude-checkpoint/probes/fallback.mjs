import { connect, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const c = await connect(); await c.send('Runtime.enable'); await c.send('Page.enable'); await c.send('Log.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const out = {};
async function run(label, source) {
  c.events.length = 0;
  const s = source && await c.send('Page.addScriptToEvaluateOnNewDocument', { source });
  try {
    await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' }); await sleep(1800);
    out[label] = await c.ev(`(()=>{const d=window.__WALDEN_DEBUG__; const gl=document.createElement('canvas').getContext('webgl2');
      const notice=document.querySelector('#scene-error'); return {exts:gl.getSupportedExtensions().filter(e=>/color_buffer|float/.test(e)),
      snapshot:d?{format:d.snapshot().touch.format,running:d.snapshot().running,frames:d.snapshot().frames}:null, noticeVisible:notice?!notice.hidden:null, noticeText:document.querySelector('#scene-error-text')?.textContent}})()`);
    if (out[label].snapshot) {
      await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 720, y: 400, button: 'left', buttons: 1, clickCount: 1 }); await sleep(250);
      out[label].contact = await c.ev('__WALDEN_DEBUG__.inspectTouch()');
      await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 720, y: 400, button: 'left', buttons: 0, clickCount: 1 });
    }
    out[label].console = c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'info'].includes(e.params.type))).map(e => [e.params.type || 'exception', e.params.args?.map(a => a.value ?? a.description).join(' ').slice(0, 200) || e.params.exceptionDetails?.exception?.description?.slice(0, 200)]);
  } finally { if (s) await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: s.identifier }); }
}
await run('native');
await run('noFloatExt', `const o=WebGL2RenderingContext.prototype.getExtension;WebGL2RenderingContext.prototype.getExtension=function(n){return n==='EXT_color_buffer_float'?null:o.call(this,n)};`);
// Every validation readback wrong: neither path validates.
await run('validationFails', `const o=WebGL2RenderingContext.prototype.readPixels;WebGL2RenderingContext.prototype.readPixels=function(...a){o.apply(this,a);const b=a[6];if(b&&b.length===4)b.fill(7)};`);
writeFileSync('../out/fallback.json', JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
await c.send('Page.navigate', { url: 'about:blank' }); c.close();
