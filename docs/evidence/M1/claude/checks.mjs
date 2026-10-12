import { connect, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const p = await connect();
await p.send('Page.enable'); await p.send('Runtime.enable');
const errors = [];
p.ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.text); if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) errors.push(d.params.type + ': ' + d.params.args.map(a => a.value ?? a.description).join(' ')); });
const snap = () => p.ev(`(({viewport,buffer,dpr,frames,elapsed,reducedMotion,camera,running,drawCalls,triangles,geometries,programs,textures,contextLost,restores})=>({viewport,buffer,dpr,frames,elapsed,reducedMotion,camera,running,drawCalls,triangles,geometries,programs,textures,contextLost,restores}))(__WALDEN_DEBUG__.snapshot())`);
const shot = async (name) => { const r = await p.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${name}.png`, Buffer.from(r.data, 'base64')); };
const out = {};
await p.send('Page.navigate', { url: 'http://127.0.0.1:5175/' }); await sleep(2000);
out.ordinary = await p.ev(`({gui: document.querySelectorAll('.lil-gui').length, api: typeof window.__WALDEN_DEBUG__, canvases: document.querySelectorAll('canvas').length, buffer:[scene.width, scene.height]})`);
await p.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' }); await sleep(2000);
out.debugTitles = await p.ev(`[...document.querySelectorAll('.lil-title')].map(t=>t.textContent)`);
out.controllers = await p.ev(`[...document.querySelectorAll('.lil-controller')].map(c=>(c.closest('.lil-gui').querySelector('.lil-title').textContent+'.'+(c.querySelector('.lil-name')?.textContent)+(c.classList.contains('lil-disabled')?'(disabled)':'')))`);
for (const [w, h, d, name] of [[390, 844, 3, 'portrait-dpr3'], [844, 390, 3, 'landscape-dpr3'], [390, 844, 1, 'portrait'], [844, 390, 1, 'landscape'], [1440, 900, 1, 'desktop'], [2560, 1080, 1, 'ultrawide']]) {
  await p.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: d, mobile: d > 1 });
  await sleep(700);
  await p.ev(`__WALDEN_DEBUG__.hidePanel(); true`);
  const s = await snap();
  const proj = await p.ev(`(()=>{const c=__WALDEN_DEBUG__.config, s=__WALDEN_DEBUG__.snapshot(); const [cx,cy,cz]=s.camera; const t=Math.tan(c.camera.fov*Math.PI/360); const a=s.viewport.width/s.viewport.height; const xs=c.curtain.width/2+c.markers.overhang; const r=[]; for(const y of [0,c.curtain.height]) for(const x of [-xs,xs]) { const dz=cz-c.markers.depth; r.push([+((x-cx)/dz/t/a).toFixed(3), +((y-cy)/dz/t).toFixed(3)]); } const wz=cz-c.wall.depth; return {markers:r, wallHalfWidthNdc:+((c.wall.width/2)/wz/t/a).toFixed(3), wallBottomNdc:+(((3-c.wall.height/2)-cy)/wz/t).toFixed(3), wallTopNdc:+(((3+c.wall.height/2)-cy)/wz/t).toFixed(3)}; })()`);
  const sc = await p.ev(`({sw:document.documentElement.scrollWidth, sh:document.documentElement.scrollHeight, iw:innerWidth, ih:innerHeight})`);
  out[name] = { s, proj, sc };
  if (d === 1) await shot(name);
  await p.ev(`__WALDEN_DEBUG__.showPanel(); true`);
}
await p.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }); await sleep(500);
await p.ev(`__WALDEN_DEBUG__.config.renderer.maxDpr=1.5; __WALDEN_DEBUG__.apply(); true`); await sleep(200);
out.maxDpr15 = (await snap()).buffer;
await p.ev(`__WALDEN_DEBUG__.config.renderer.maxDpr=2; __WALDEN_DEBUG__.apply(); true`);
await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
try { await p.send('Input.synthesizePinchGesture', { x: 195, y: 422, scaleFactor: 2, gestureSourceType: 'touch' }); } catch (e) { out.pinchErr = e.message; }
await sleep(500);
out.afterPinch = await p.ev(`({scale: visualViewport.scale, sw: document.documentElement.scrollWidth})`);
try { await p.send('Input.synthesizeScrollGesture', { x: 195, y: 422, yDistance: -400, gestureSourceType: 'touch' }); } catch (e) { out.scrollErr = e.message; }
await sleep(300);
out.afterScroll = await p.ev(`({scrollY, scale: visualViewport.scale, offTop: visualViewport.offsetTop})`);
await p.send('Emulation.setTouchEmulationEnabled', { enabled: false });
await p.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }); await sleep(500);
out.wheel = await p.ev(`(()=>{ const ev=new WheelEvent('wheel',{deltaY:100,ctrlKey:true,cancelable:true,bubbles:true}); scene.dispatchEvent(ev); return {defaultPrevented: ev.defaultPrevented}; })()`);
const cams = []; for (let i = 0; i < 6; i++) { cams.push((await snap()).camera); await sleep(500); }
out.driftCams = cams;
const c0 = (await snap()).camera;
await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 450, button: 'left', clickCount: 1 });
for (let i = 1; i <= 10; i++) await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700 + i * 30, y: 450 + i * 10, button: 'left', buttons: 1 });
await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 1000, y: 550, button: 'left', clickCount: 1 });
await p.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 450, deltaX: 0, deltaY: 500 });
out.dragDrift = { before: c0, after: (await snap()).camera, scroll: await p.ev('[scrollX, scrollY]') };
await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await sleep(300);
const rm = []; for (let i = 0; i < 4; i++) { const s = await snap(); rm.push([s.reducedMotion, s.camera]); await sleep(400); }
await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 450, button: 'left', clickCount: 1 });
for (let i = 1; i <= 10; i++) await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700 - i * 30, y: 450, button: 'left', buttons: 1 });
await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 400, y: 450, button: 'left', clickCount: 1 });
rm.push(['afterDrag', (await snap()).camera]);
out.reducedMotion = rm;
await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] }); await sleep(300);
out.rmOff = (await snap()).reducedMotion;
await p.ev(`__WALDEN_DEBUG__.config.camera.drift=false; __WALDEN_DEBUG__.apply(); true`); await sleep(300);
const d1 = (await snap()).camera; await sleep(500); out.driftOff = [d1, (await snap()).camera];
await p.ev(`__WALDEN_DEBUG__.config.camera.drift=true; __WALDEN_DEBUG__.apply(); true`);
out.guiDom = await p.ev(`(async()=>{ const ctrls=[...document.querySelectorAll('.lil-controller')]; const op=ctrls.find(c=>c.querySelector('.lil-name')?.textContent==='opacity' && c.closest('.lil-gui').querySelector('.lil-title').textContent==='curtain'); const inp=op?.querySelector('input'); if(!inp) return 'no input'; inp.value='0.6'; inp.dispatchEvent(new Event('input',{bubbles:true})); inp.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,100)); return {configOpacity: __WALDEN_DEBUG__.config.curtain.opacity}; })()`);
await p.ev(`__WALDEN_DEBUG__.config.curtain.opacity=0.28; __WALDEN_DEBUG__.apply(); true`);
const ctx = [];
for (let i = 0; i < 3; i++) {
  await p.ev(`__WALDEN_DEBUG__.loseContext(); true`); await sleep(400);
  const a = await snap(); const n1 = await p.ev(`!document.querySelector('#scene-error').hidden`);
  await sleep(500); const f1 = (await snap()).frames;
  await p.ev(`__WALDEN_DEBUG__.restoreContext(); true`); await sleep(800);
  const b = await snap(); const n2 = await p.ev(`!document.querySelector('#scene-error').hidden`);
  ctx.push({ lost: { running: a.running, contextLost: a.contextLost, notice: n1, framesHeld: a.frames === f1 }, restored: { running: b.running, notice: n2, restores: b.restores, framesAdv: b.frames > f1, geometries: b.geometries, programs: b.programs, textures: b.textures, drawCalls: b.drawCalls, triangles: b.triangles } });
}
out.context = ctx;
await shot('after-context');
out.errors = errors;
console.log(JSON.stringify(out, null, 1));
p.close();
