import { connect, browserSend, sleep } from './cdp.mjs';
const f = await browserSend('Target.createTarget', { url: 'about:blank' }); const c = await connect(f.targetId);
await c.send('Runtime.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await c.send('Page.navigate', { url: 'http://127.0.0.1:5175/?debug' }); await sleep(2500);
console.log(await c.ev('[document.querySelectorAll(".lil-gui").length, document.querySelector(".lil-gui")?.className, document.querySelector(".lil-gui")?.innerText.slice(0,200)]'));console.log(JSON.stringify(await c.ev(`(()=>{const r={};for(const el of document.querySelectorAll('.lil-controller')){const n=el.querySelector('.lil-name')?.textContent.trim();const fo=el.closest('.lil-gui:not(.lil-root)')?.querySelector('.lil-title')?.textContent.trim();if(['flowSpeed','opacity','color'].includes(n)){const i=el.querySelector('input');r[fo+'.'+n]=i?.value}}return [document.querySelectorAll('.lil-controller').length,r]})()`)));
c.close(); await browserSend('Target.closeTarget', { targetId: f.targetId });
