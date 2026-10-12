import {connect,browserSend,sleep} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const c=await connect();await browserSend('Target.activateTarget',{targetId:c.target.id});
await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await c.send('Page.navigate',{url:'http://127.0.0.1:5174/?debug'});await sleep(2000);
await c.ev('void (()=>{const d=__WALDEN_DEBUG__,s=d.config;d.hidePanel();s.camera.drift=false;s.water.flowSpeed=0;s.wet.trickleSpeed=0;d.apply()})()');
async function shot(name,change='') {if(change)await c.ev(`void (()=>{const s=__WALDEN_DEBUG__.config;${change};__WALDEN_DEBUG__.apply()})()`);await sleep(300);writeFileSync(`docs/evidence/M3/final/${name}.png`,Buffer.from((await c.send('Page.captureScreenshot')).data,'base64'));}
await shot('full-wall');await shot('half-wall','s.refraction.wallResolution=0.5');
await shot('glint-on','s.refraction.wallResolution=1');await shot('glint-off','s.water.glint=0');
await shot('water-mask',"s.water.view='light mask'");c.close();
