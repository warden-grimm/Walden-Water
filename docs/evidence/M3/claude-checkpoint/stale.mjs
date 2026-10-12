import { connect, sleep } from './cdp.mjs';
const c = await connect();
await c.ev(`void (()=>{ window.__probeDeletes=[]; const P=WebGL2RenderingContext.prototype; for (const n of ['deleteFramebuffer','deleteTexture','deleteRenderbuffer','deleteBuffer','deleteProgram']) { const f=P[n]; P[n]=function(o){ if (window.__probeArm) window.__probeDeletes.push(n+' '+(new Error().stack.split(String.fromCharCode(10)).slice(2,7).map(s=>s.trim().replace(location.origin,'')).join(' | '))); return f.call(this,o); }; } })()`);
await c.ev(`void __WALDEN_DEBUG__.loseContext()`); await sleep(800);
await c.ev(`window.__probeArm=true; void __WALDEN_DEBUG__.restoreContext()`); await sleep(1500);
console.log((await c.ev(`(window.__probeArm=false, window.__probeDeletes)`)).join('\n\n')); c.close();
