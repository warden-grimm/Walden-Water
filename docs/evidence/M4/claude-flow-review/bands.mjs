import { connect, browserSend, sleep } from './cdp.mjs';
import { writeFile } from 'node:fs/promises';
const f = await browserSend('Target.createTarget', { url: 'about:blank' }); const c = await connect(f.targetId);
await c.send('Runtime.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' }); await browserSend('Target.activateTarget', { targetId: f.targetId }); await sleep(2500);
for (const s of [1, 1.15]) {
  await c.ev(`void (()=>{const d=__WALDEN_DEBUG__;d.config.camera.drift=false;d.config.water.view='flow bands';d.config.water.flowSpeed=${s};d.apply();d.hidePanel();window.__chunks=[];window.__rec=new MediaRecorder(document.querySelector('canvas').captureStream(60),{mimeType:'video/webm',videoBitsPerSecond:4000000});__rec.ondataavailable=e=>__chunks.push(e.data);__rec.start();})()`);
  await sleep(5000);
  const clip = await c.ev(`new Promise(resolve=>{__rec.onstop=()=>{__rec.stream.getTracks().forEach(t=>t.stop());const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(__chunks,{type:'video/webm'}));};__rec.stop();})`);
  await writeFile(new URL(`./out/bands-${s}.webm`, import.meta.url), Buffer.from(clip, 'base64'));
}
await c.send('Page.captureScreenshot').then(r => writeFile(new URL('./out/bands-1.15.png', import.meta.url), Buffer.from(r.data, 'base64')));
c.close(); await browserSend('Target.closeTarget', { targetId: f.targetId });
