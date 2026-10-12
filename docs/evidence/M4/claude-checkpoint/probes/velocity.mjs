// Input events at 60 Hz, frames at 60/120/144 Hz; same 0.5 m/s finger. Reports strength series.
import { pathToFileURL } from 'node:url';
const src = p => pathToFileURL('C:/Users/Adam Tate/orca/workspaces/Walden-Water/claude-m4-checkpoint/' + p).href;
const { config } = await import(src('src/config.js'));
const { createCamera } = await import(src('src/scene/camera.js'));
const { createPointerTracker } = await import(src('src/interaction/PointerTracker.js'));
class Surface extends EventTarget { captures = new Set(); rect = { left: 0, top: 0, width: 1000, height: 1000 }; hidden = false;
  getBoundingClientRect() { return this.rect; } hasPointerCapture(id) { return this.captures.has(id); } setPointerCapture(id) { this.captures.add(id); } releasePointerCapture(id) { this.captures.delete(id); }
  send(type, x, y) { const e = new Event(type, { cancelable: true }); Object.assign(e, { pointerId: 1, clientX: x, clientY: y, pointerType: 'touch', buttons: 1, button: 0 }); this.dispatchEvent(e); } }
const out = {};
for (const hz of [60, 120, 144]) {
  const settings = structuredClone(config), view = createCamera(settings, { value: 0 }); view.configure(1, true);
  const canvas = new Surface(), t = createPointerTracker(canvas, settings, new Surface(), new Surface());
  // px per second giving ~0.5 m/s: measure scale first
  canvas.send('pointerdown', 400, 500); t.update(view.camera, 1 / hz);
  const s = []; let nextEvent = 0, x = 400;
  for (let f = 1; f <= hz / 2; f++) { const time = f / hz; while (nextEvent + 1 / 60 <= time + 1e-9) { nextEvent += 1 / 60; x = 400 + nextEvent * 100; canvas.send('pointermove', x, 500); } t.update(view.camera, 1 / hz); s.push(+t.strengths[0].toFixed(3)); }
  out[hz + 'Hz frames'] = { maxStrength: Math.max(...s), minStrength: Math.min(...s), first8: s.slice(0, 8) }; t.dispose();
}
console.log(JSON.stringify(out, null, 1));
