import { connect } from './cdp.mjs';
const c = await connect(); await c.send('Runtime.enable');
console.log(await c.ev(`(()=>{const gl=document.createElement('canvas').getContext('webgl2');const e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL)})()`)); c.close();
