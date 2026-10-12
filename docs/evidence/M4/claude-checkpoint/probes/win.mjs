import { connect, browserSend, sleep } from './cdp.mjs';
const c = await connect();
const w = await browserSend('Browser.getWindowForTarget', { targetId: c.target.id });
await browserSend('Browser.setWindowBounds', { windowId: w.windowId, bounds: { left: 0, top: 0, width: 1460, height: 1000, windowState: 'normal' } });
await sleep(1500);
console.log(await c.ev('({hidden:document.hidden, s:__WALDEN_DEBUG__.snapshot().frames})'));
c.close();
