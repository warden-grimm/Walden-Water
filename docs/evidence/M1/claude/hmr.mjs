import { connect, sleep } from './cdp.mjs';
import { utimesSync } from 'node:fs';
const ROOT = 'C:/Users/Adam Tate/orca/workspaces/Walden-Water/claude-m1-review/';
const p = await connect();
await p.send('Page.enable'); await p.send('Runtime.enable');
const logs = [];
p.ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.consoleAPICalled') logs.push(d.params.type + ': ' + d.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 160)); if (d.method === 'Runtime.exceptionThrown') logs.push('EXC ' + d.params.exceptionDetails.text); });
await p.send('Page.addScriptToEvaluateOnNewDocument', { source: `
(() => {
  const live = new Map(); // key -> count
  const name = t => t === window ? 'window' : t === document ? 'document' : t instanceof MediaQueryList ? 'mql:' + t.media : t instanceof HTMLCanvasElement ? 'canvas' : t instanceof Element ? (t.id ? '#' + t.id : t.tagName) : (t.constructor && t.constructor.name);
  const reg = new WeakMap();
  const add = EventTarget.prototype.addEventListener, rem = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    let s = reg.get(this); if (!s) reg.set(this, s = new Map());
    const cap = typeof opts === 'boolean' ? opts : !!opts?.capture; const k = type + '|' + cap;
    let ks = s.get(fn); if (!ks) s.set(fn, ks = new Set());
    if (fn && !ks.has(k)) { ks.add(k); const key = name(this) + ':' + type; live.set(key, (live.get(key) || 0) + 1); }
    return add.call(this, type, fn, opts);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, opts) {
    const cap = typeof opts === 'boolean' ? opts : !!opts?.capture; const k = type + '|' + cap;
    const ks = reg.get(this)?.get(fn); if (ks && ks.has(k)) { ks.delete(k); const key = name(this) + ':' + type; live.set(key, (live.get(key) || 0) - 1); }
    return rem.call(this, type, fn, opts);
  };
  let rafCalls = 0; const raf = window.requestAnimationFrame;
  window.requestAnimationFrame = function (cb) { rafCalls++; return raf.call(this, cb); };
  let contexts = 0; const gc = HTMLCanvasElement.prototype.getContext; const seen = new WeakSet();
  HTMLCanvasElement.prototype.getContext = function (...a) { const c = gc.apply(this, a); if (c && !seen.has(c)) { seen.add(c); contexts++; } return c; };
  window.__probe = () => ({ listeners: Object.fromEntries([...live].filter(([k, v]) => v && !/^(DIV|INPUT|BUTTON|SPAN|LABEL|SELECT)/.test(k))), rafCalls, contexts });
})();` });
await p.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' }); await sleep(2500);
await p.ev('window.__marker = 1; true');
const state = async () => {
  const r0 = await p.ev('__probe().rafCalls'); const f0 = await p.ev('__WALDEN_DEBUG__.snapshot().frames'); await sleep(1000);
  const r1 = await p.ev('__probe().rafCalls'); const f1 = await p.ev('__WALDEN_DEBUG__.snapshot().frames');
  return await p.ev(`(() => { const s = __WALDEN_DEBUG__.snapshot(); return { marker: window.__marker, canvases: document.querySelectorAll('canvas').length, guiRoots: document.querySelectorAll('.lil-gui.lil-root').length, guiAll: document.querySelectorAll('.lil-gui').length, ...__probe(), running: s.running, geometries: s.geometries, programs: s.programs, textures: s.textures, draws: s.drawCalls, elapsed: +s.elapsed.toFixed(2) }; })()`).then(o => ({ ...o, rafPerSec: r1 - r0, appFramesPerSec: f1 - f0 }));
};
const rows = [['initial', await state()]];
const files = ['src/main.js', 'src/scene/createScene.js', 'src/config.js', 'src/main.js', 'src/debug/panel.js', 'src/main.js'];
for (const f of files) {
  const t = new Date(); utimesSync(ROOT + f, t, t);
  await sleep(2500);
  rows.push([f, await state()]);
}
for (const [k, v] of rows) console.log(k, JSON.stringify(v));
console.log('logs', JSON.stringify(logs.filter(l => !/vite\] (connect|server)/.test(l)).slice(-30), null, 0));
p.close();
