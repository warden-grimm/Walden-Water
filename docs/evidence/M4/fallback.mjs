import {connect,sleep} from '../M3/cdp.mjs';
import {writeFile} from 'node:fs/promises';
const c=await connect();await c.send('Page.enable');await c.send('Runtime.enable');
const script=await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`const original=WebGL2RenderingContext.prototype.getExtension;WebGL2RenderingContext.prototype.getExtension=function(name){return name==='EXT_color_buffer_float'?null:original.call(this,name)};`});
try {
 await c.send('Page.navigate',{url:'http://127.0.0.1:5174/?debug'});await sleep(1200);
 await c.ev('void __WALDEN_DEBUG__.hidePanel()');
 const result={snapshot:await c.ev('__WALDEN_DEBUG__.snapshot()'),neutral:await c.ev('__WALDEN_DEBUG__.inspectTouch()')};
 await c.send('Input.dispatchMouseEvent',{type:'mousePressed',x:720,y:310,button:'left',buttons:1,clickCount:1});await sleep(200);
 result.contact=await c.ev('__WALDEN_DEBUG__.inspectTouch()');
 await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:720,y:310,button:'left',buttons:0});
 await writeFile(new URL('./checkpoint/automatic-fallback.json',import.meta.url),JSON.stringify(result,null,2));
 console.log(JSON.stringify({format:result.snapshot.touch.format,neutral:result.neutral,contact:result.contact}));
} finally {await c.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script.identifier});await c.send('Page.navigate',{url:'about:blank'});c.close();}
