// Matched stills and a short M4 regression smoke; Edge CDP :9333, preview :5174.
import { connect, browserSend, sleep } from '../M3/cdp.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
// An optional preset keeps subsequent visual tuning evidence in its own directory.
const preset = process.argv[2] ? JSON.parse(await readFile(new URL(process.argv[2], import.meta.url), 'utf8')) : {};
const out = new URL(preset.output || './contrast/', import.meta.url);
await mkdir(out, { recursive: true });
const old = preset.old || { rock: '#525c66', water: '#88adb7', opacity: 0.36, flowSpeed: 1 };
const next = preset.next || { rock: '#4b555e', water: '#9cbdc6', opacity: 0.40, flowSpeed: 1 };
const result = { measuredAt: new Date().toISOString(), old, next, views: [] };
const fresh = await browserSend('Target.createTarget', { url: 'about:blank' });
const c = await connect(fresh.targetId);
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
try {
  await c.send('Page.navigate', { url: 'http://127.0.0.1:5174/?debug' });
  await browserSend('Target.activateTarget', { targetId: fresh.targetId }); await sleep(1800);
  result.browser = await c.ev('navigator.userAgent');
  result.defaults = await c.ev('({rock:__WALDEN_DEBUG__.config.rock.color,water:__WALDEN_DEBUG__.config.curtain.color,opacity:__WALDEN_DEBUG__.config.curtain.opacity,flowSpeed:__WALDEN_DEBUG__.config.water.flowSpeed})');
  if (preset.output && JSON.stringify(result.defaults) !== JSON.stringify(next)) throw new Error('Loaded defaults differ from submitted preset');
  await c.ev(`void (()=>{window.__delivered={down:0,up:0};const canvas=document.querySelector('canvas');canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')__delivered.down++});canvas.addEventListener('pointerup',e=>{if(e.pointerType==='touch')__delivered.up++});})()`);
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
  for (const [width, height, mode] of [[390, 844, 'auto'], [844, 390, 'byte']]) {
    await c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });
    await c.ev(`void (() => { const d=__WALDEN_DEBUG__; d.config.camera.drift=false; d.config.water.flowSpeed=0; d.config.wet.trickleSpeed=0; d.config.touch.precision='${mode}'; d.apply(); d.hidePanel(); d.resetTouch(); })()`);
    await sleep(300);
    for (const [label, values] of [['before', old], ['after', next]]) {
      await c.ev(`void (() => { const d=__WALDEN_DEBUG__; d.config.rock.color='${values.rock}'; d.config.curtain.color='${values.water}'; d.config.curtain.opacity=${values.opacity}; d.apply(); })()`);
      await sleep(200);
      await writeFile(new URL(`${width}x${height}-${label}.png`, out), Buffer.from((await c.send('Page.captureScreenshot')).data, 'base64'));
    }
    // Record actual motion separately from the frozen matched-color comparison.
    if (preset.clipSeconds) for (const [label, values] of [['before', old], ['after', next]]) {
      await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;d.config.rock.color='${values.rock}';d.config.curtain.color='${values.water}';d.config.curtain.opacity=${values.opacity};d.config.water.flowSpeed=${values.flowSpeed};d.config.wet.trickleSpeed=.35;d.apply();window.__chunks=[];window.__rec=new MediaRecorder(document.querySelector('canvas').captureStream(30),{mimeType:'video/webm',videoBitsPerSecond:1500000});__rec.ondataavailable=e=>__chunks.push(e.data);__rec.start()})()`);
      await sleep(preset.clipSeconds * 1000);
      const clip = await c.ev(`new Promise(resolve=>{__rec.onstop=()=>{__rec.stream.getTracks().forEach(t=>t.stop());const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(__chunks,{type:'video/webm'}));};__rec.stop();})`);
      await writeFile(new URL(`${width}x${height}-${label}.webm`, out), Buffer.from(clip,'base64'));
    }
    await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;d.config.camera.drift=true;d.config.water.flowSpeed=${next.flowSpeed};d.config.wet.trickleSpeed=.35;d.apply();__delivered.down=0;__delivered.up=0})()`);
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: width/2-25, y: height*.4 }, { id: 2, x: width/2+25, y: height*.6 }] });
    await sleep(3000);
    const held = await c.ev('({snapshot:__WALDEN_DEBUG__.snapshot(),field:__WALDEN_DEBUG__.inspectTouch()})');
    if (held.snapshot.touch.count !== 2 || held.field.max < .8) throw new Error('Two-contact smoke failed');
    await writeFile(new URL(`${width}x${height}-touch-${mode}.png`, out), Buffer.from((await c.send('Page.captureScreenshot')).data, 'base64'));
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(2200);
    const healed = await c.ev('({snapshot:__WALDEN_DEBUG__.snapshot(),field:__WALDEN_DEBUG__.inspectTouch()})');
    if (healed.snapshot.touch.count !== 0 || healed.field.max !== 0) throw new Error('Recovery smoke failed');
    const delivered = await c.ev('__delivered');
    if (delivered.down !== 2 || delivered.up !== 2) throw new Error('DOM touch delivery failed');
    result.views.push({ width, height, dpr: 2, mode, delivered, held, healed });
  }
  result.console = c.events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error','warning','warn'].includes(e.params.type)) || (e.method === 'Log.entryAdded' && ['error','warning'].includes(e.params.entry.level)));
  if (result.console.length) throw new Error('Browser errors/warnings');
  await writeFile(new URL('smoke.json', out), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ views: result.views.map(v => ({ width:v.width, height:v.height, mode:v.mode, contacts:v.held.snapshot.touch.count, recovered:v.healed.field.max })), console:result.console }));
} finally { c.close(); await browserSend('Target.closeTarget', { targetId:fresh.targetId }); }
