import { Raycaster, Vector2, Vector4 } from 'three';
import { intersectCurtain } from './curtainContact.js';

// Fixed shader capacity, not an unbounded queue. Ignore extra fingers rather
// than stealing an existing pointer's slot. Event handlers never alter camera.
export const POINTER_CAPACITY = 10;
export function createPointerTracker(canvas, config, ownerWindow = window, ownerDocument = document) {
  const slots = Array.from({ length: POINTER_CAPACITY }, () => ({ id: null, held: false, pending: false,
    x: 0, y: 0, previousX: 0, previousY: 0, uv: new Vector2(), valid: false }));
  const segments = Array.from({ length: POINTER_CAPACITY }, () => new Vector4());
  const strengths = new Float32Array(POINTER_CAPACITY);
  const count = { value: 0 }, raycaster = new Raycaster(), ndc = new Vector2(), startUv = new Vector2();
  let left = 0, top = 0, width = 1, height = 1;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    left = rect.left; top = rect.top; width = rect.width; height = rect.height;
    for (const slot of slots) { slot.previousX = slot.x; slot.previousY = slot.y; }
  }
  function find(id) { for (const slot of slots) if (slot.id === id) return slot; }
  function release(slot, pending = false) {
    const id = slot.id;
    slot.held = false; slot.pending = pending;
    if (!pending) { slot.id = null; slot.valid = false; }
    if (id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  function clear() { for (const slot of slots) release(slot); count.value = 0; }
  function down(event) {
    if (!config.touch.enabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (find(event.pointerId)) return;
    let slot;
    for (const candidate of slots) if (candidate.id === null) { slot = candidate; break; }
    if (!slot) return;
    event.preventDefault(); resize();
    slot.id = event.pointerId; slot.held = true; slot.pending = true;
    slot.x = slot.previousX = event.clientX; slot.y = slot.previousY = event.clientY;
    try { canvas.setPointerCapture(event.pointerId); } catch { release(slot); }
  }
  function move(event) {
    const slot = find(event.pointerId);
    if (!slot?.held) return;
    if (event.pointerType === 'mouse' && !(event.buttons & 1)) { release(slot); return; }
    event.preventDefault(); slot.x = event.clientX; slot.y = event.clientY; slot.pending = true;
  }
  function up(event) {
    const slot = find(event.pointerId);
    if (!slot) return;
    slot.x = event.clientX; slot.y = event.clientY;
    release(slot, slot.pending); // Preserve a tap that began and ended between frames.
  }
  function cancel(event) { const slot = find(event.pointerId); if (slot) release(slot); }
  function lost(event) { const slot = find(event.pointerId); if (slot?.held) release(slot); }
  function visibility() { if (ownerDocument.hidden) clear(); }
  function contact(x, y, camera, result) {
    if (x < left || x > left + width || y < top || y > top + height) return false;
    ndc.set((x - left) / width * 2 - 1, 1 - (y - top) / height * 2);
    raycaster.setFromCamera(ndc, camera);
    return intersectCurtain(raycaster.ray, config.curtain, result);
  }
  function update(camera, delta) {
    count.value = 0;
    if (!config.touch.enabled) { clear(); return; }
    for (const slot of slots) {
      if (slot.id === null) continue;
      slot.valid = contact(slot.x, slot.y, camera, slot.uv);
      if (slot.valid) {
        if (!contact(slot.previousX, slot.previousY, camera, startUv)) startUv.copy(slot.uv);
        // Reproject both screen positions using THIS frame's camera. Drift alone
        // therefore does not invent swipe velocity for a stationary finger.
        const distance = Math.hypot((slot.uv.x - startUv.x) * config.curtain.width,
          (slot.uv.y - startUv.y) * config.curtain.height);
        const speed = delta > 0 ? distance / delta : 0;
        const index = count.value++;
        segments[index].set(startUv.x, startUv.y, slot.uv.x, slot.uv.y);
        strengths[index] = Math.min(config.touch.maxStrength, config.touch.holdStrength + speed * config.touch.velocityGain);
      }
      slot.previousX = slot.x; slot.previousY = slot.y; slot.pending = false;
      if (!slot.held) { slot.id = null; slot.valid = false; }
    }
  }
  canvas.addEventListener('pointerdown', down, { passive: false });
  canvas.addEventListener('pointermove', move, { passive: false });
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('lostpointercapture', lost);
  ownerWindow.addEventListener('blur', clear);
  ownerDocument.addEventListener('visibilitychange', visibility);
  resize();
  return { segments, strengths, count, resize, update, clear,
    snapshot: () => ({ count: count.value, pointers: slots.filter(s => s.id !== null).map(s => ({ id: s.id, held: s.held, valid: s.valid, uv: s.uv.toArray() })) }),
    dispose() {
      clear();
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('lostpointercapture', lost); ownerWindow.removeEventListener('blur', clear);
      ownerDocument.removeEventListener('visibilitychange', visibility);
    } };
}
