import { connect, browserSend, sleep } from './cdp.mjs';
import { writeFile, mkdir } from 'node:fs/promises';
await mkdir('out', { recursive: true });
const W = 390, H = 844;
const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(fresh.targetId);
const r = {};
const snap = () => c.ev('__WALDEN_DEBUG__.snapshot()');
const info = s => ({ draws: s.drawCalls, geometries: s.geometries, textures: s.textures, programs: s.programs, bursts: s.particles.bursts, spray: s.particles.spray, motes: s.particles.motes, touch: { count: s.touch.count, format: s.touch.format, available: s.touch.available } });
const apply = js => c.ev(`void (()=>{const d=__WALDEN_DEBUG__;${js};d.apply()})()`);
const touch = (type, pts) => c.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
async function swipe(id, x0, y0, x1, y1, steps = 8) {
  await touch('touchStart', [{ id, x: x0, y: y0 }]);
  for (let i = 1; i <= steps; i++) { await sleep(16); await touch('touchMove', [{ id, x: x0 + (x1 - x0) * i / steps, y: y0 + (y1 - y0) * i / steps }]); }
  await touch('touchEnd', []);
}
try {
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
  await c.send('Page.navigate', { url: 'http://127.0.0.1:5176/?debug' });
  await browserSend('Target.activateTarget', { targetId: fresh.targetId });
  await sleep(2500); await c.ev('void __WALDEN_DEBUG__.hidePanel()');
  r.initial = info(await snap());
  // 1. Held finger with +/-2 px random jitter at ~60 Hz for 3 s.
  let e0 = (await snap()).particles.bursts.emitted;
  await touch('touchStart', [{ id: 1, x: 195, y: 300 }]);
  for (let i = 0; i < 180; i++) { await sleep(16); await touch('touchMove', [{ id: 1, x: 195 + (Math.random() * 4 - 2), y: 300 + (Math.random() * 4 - 2) }]); }
  r.jitterHold = { emitted: (await snap()).particles.bursts.emitted - e0, contacts: (await snap()).touch.count };
  await touch('touchEnd', []); await sleep(500);
  // 2. Slow drag (0.1 m/s-ish): parts but should not spray beyond the press.
  e0 = (await snap()).particles.bursts.emitted;
  await touch('touchStart', [{ id: 2, x: 150, y: 400 }]);
  for (let i = 1; i <= 120; i++) { await sleep(16); await touch('touchMove', [{ id: 2, x: 150 + i * 0.3, y: 400 }]); }
  await touch('touchEnd', []);
  r.slowDrag = { emitted: (await snap()).particles.bursts.emitted - e0 };
  await sleep(500);
  // 3. Start off the curtain (left edge of screen) and drag onto it.
  e0 = (await snap()).particles.bursts.emitted;
  await swipe(3, 5, 400, 200, 400, 12);
  r.offCurtainEntry = { emitted: (await snap()).particles.bursts.emitted - e0 };
  await sleep(500);
  // 4. Rebuilds while bursts are live.
  await swipe(4, 150, 350, 250, 350); await sleep(100);
  const before = await snap();
  await apply('d.config.bursts.slots=32;d.config.spray.count=400;d.config.dust.capacity=2000;d.config.dust.mistCount=80;d.config.bursts.perBurst=16');
  await sleep(300);
  r.afterRebuild = info(await snap());
  await swipe(5, 150, 350, 250, 350); await sleep(100);
  r.afterRebuildSwipe = info(await snap());
  await apply('d.config.bursts.slots=96;d.config.spray.count=720;d.config.dust.capacity=1200;d.config.dust.mistCount=36;d.config.bursts.perBurst=32');
  await sleep(300); r.restored = info(await snap());
  r.beforeRebuild = info(before);
  // 5. Disable bursts, swipe, re-enable.
  await apply('d.config.bursts.enabled=false'); e0 = (await snap()).particles.bursts.emitted;
  await swipe(6, 150, 350, 250, 350); await sleep(100);
  r.disabled = { emitted: (await snap()).particles.bursts.emitted - e0, visible: (await snap()).particles.bursts.visible };
  await apply('d.config.bursts.enabled=true'); await sleep(100);
  // 6. Byte mode.
  await apply("d.config.touch.precision='byte'"); await sleep(500);
  e0 = (await snap()).particles.bursts.emitted;
  await swipe(7, 150, 350, 250, 350); await sleep(100);
  r.byte = { emitted: (await snap()).particles.bursts.emitted - e0, ...info(await snap()).touch };
  await apply("d.config.touch.precision='auto'"); await sleep(500);
  // 7. Touch disabled.
  await apply('d.config.touch.enabled=false'); e0 = (await snap()).particles.bursts.emitted;
  await swipe(8, 150, 350, 250, 350); await sleep(100);
  r.touchDisabled = { emitted: (await snap()).particles.bursts.emitted - e0 };
  await apply('d.config.touch.enabled=true'); await sleep(300);
  // 8. Hidden page while held then visible.
  await touch('touchStart', [{ id: 9, x: 195, y: 300 }]); await sleep(200);
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: false });
  await c.ev("void (Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}),document.dispatchEvent(new Event('visibilitychange')))");
  await sleep(300);
  r.hidden = { contacts: (await snap()).touch.count, pointers: (await snap()).touch.pointers.length };
  await c.ev("void (delete document.hidden, document.dispatchEvent(new Event('visibilitychange')))");
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await touch('touchEnd', []); await sleep(300);
  // 9. Context loss twice.
  for (let k = 0; k < 2; k++) { await c.ev('void __WALDEN_DEBUG__.loseContext()'); await sleep(500); await c.ev('void __WALDEN_DEBUG__.restoreContext()'); await sleep(1200); }
  e0 = (await snap()).particles.bursts.emitted;
  await swipe(10, 150, 350, 250, 350); await sleep(150);
  r.afterRestore = { emitted: (await snap()).particles.bursts.emitted - e0, restores: (await snap()).restores, running: (await snap()).running, ...info(await snap()) };
  await c.send('Page.captureScreenshot').then(s => writeFile('out/lifecycle-after-restore.png', Buffer.from(s.data, 'base64')));
  r.console = c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(e.params.type)) || (e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params.entry.level))).map(e => JSON.stringify(e.params).slice(0, 300));
  r.logs = c.events.filter(e => e.method === 'Runtime.consoleAPICalled').map(e => e.params.type + ': ' + e.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 200));
  await writeFile('out/lifecycle.json', JSON.stringify(r, null, 1));
  console.log(JSON.stringify(r, null, 1));
} finally { c.close(); await browserSend('Target.closeTarget', { targetId: fresh.targetId }); }
