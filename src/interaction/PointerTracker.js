import { Raycaster, Vector2, Vector4 } from 'three';
import { intersectCurtain } from './curtainContact.js';

// Fixed shader capacity, not an unbounded queue. Ignore extra fingers rather
// than stealing an existing pointer's slot. Event handlers never alter camera.
export const POINTER_CAPACITY = 10;
const HISTORY_CAPACITY = 16;
export function createPointerTracker(canvas, config, ownerWindow = window, ownerDocument = document) {
  const slots = Array.from({ length: POINTER_CAPACITY }, () => ({ id: null, held: false, pending: false, fresh: false,
    x: 0, y: 0, previousX: 0, previousY: 0, eventTime: 0, velocityAge: 0,
    history: new Float64Array(HISTORY_CAPACITY * 3), historyIndex: 0, historyCount: 0,
    uv: new Vector2(), valid: false }));
  const segments = Array.from({ length: POINTER_CAPACITY }, () => new Vector4());
  const strengths = new Float32Array(POINTER_CAPACITY);
  // Parallel to segments: curtain-plane drag velocity (m/s, +x right, +y up),
  // the stable slot index for per-finger state, and 1 on a press's first frame.
  const velocities = new Float32Array(POINTER_CAPACITY * 2);
  const sources = new Uint8Array(POINTER_CAPACITY), began = new Uint8Array(POINTER_CAPACITY);
  const count = { value: 0 }, raycaster = new Raycaster(), ndc = new Vector2(), startUv = new Vector2();
  let left = 0, top = 0, width = 1, height = 1;
  let available = true, previousTimestamp = null;
  function seedHistory(slot) {
    slot.historyIndex = 0; slot.historyCount = 1;
    slot.history[0] = slot.x; slot.history[1] = slot.y; slot.history[2] = slot.eventTime;
  }
  function readBounds() {
    const rect = canvas.getBoundingClientRect();
    left = rect.left; top = rect.top; width = rect.width; height = rect.height;
  }
  function resize() {
    readBounds();
    for (const slot of slots) { slot.previousX = slot.x; slot.previousY = slot.y; seedHistory(slot); }
  }
  function find(id) { for (const slot of slots) if (slot.id === id) return slot; }
  function release(slot, pending = false) {
    const id = slot.id;
    slot.held = false; slot.pending = pending;
    if (!pending) { slot.id = null; slot.valid = false; }
    if (id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  function clear() { for (const slot of slots) release(slot); count.value = 0; previousTimestamp = null; }
  function down(event) {
    if (!available || !config.touch.enabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
    let slot = find(event.pointerId);
    if (slot?.held) return;
    // Re-arm a pending tap when a mouse/pen ID is reused before the next frame.
    if (!slot) for (const candidate of slots) if (candidate.id === null) { slot = candidate; break; }
    if (!slot) return;
    event.preventDefault(); readBounds();
    slot.id = event.pointerId; slot.held = true; slot.pending = true; slot.fresh = true;
    slot.x = slot.previousX = event.clientX; slot.y = slot.previousY = event.clientY;
    slot.eventTime = event.timeStamp; slot.velocityAge = 0; seedHistory(slot);
    try { canvas.setPointerCapture(event.pointerId); } catch { release(slot); }
  }
  function sample(slot, event) {
    const monotonic = event.timeStamp > slot.eventTime;
    slot.x = event.clientX; slot.y = event.clientY;
    slot.eventTime = event.timeStamp;
    if (!monotonic) { seedHistory(slot); return; }
    slot.historyIndex = (slot.historyIndex + 1) % HISTORY_CAPACITY;
    slot.historyCount = Math.min(slot.historyCount + 1, HISTORY_CAPACITY);
    const offset = slot.historyIndex * 3;
    slot.history[offset] = slot.x; slot.history[offset + 1] = slot.y; slot.history[offset + 2] = slot.eventTime;
  }
  function move(event) {
    const slot = find(event.pointerId);
    if (!slot?.held) return;
    if (event.pointerType === 'mouse' && !(event.buttons & 1)) { release(slot); return; }
    event.preventDefault(); sample(slot, event); slot.pending = true;
  }
  function up(event) {
    const slot = find(event.pointerId);
    if (!slot) return;
    if (slot.x !== event.clientX || slot.y !== event.clientY) sample(slot, event);
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
  function update(camera, timestamp = performance.now()) {
    count.value = 0;
    if (!available || !config.touch.enabled) { clear(); return; }
    const elapsed = previousTimestamp === null ? 0 : Math.max(0, timestamp - previousTimestamp);
    previousTimestamp = timestamp;
    for (let s = 0; s < POINTER_CAPACITY; s++) {
      const slot = slots[s];
      if (slot.id === null) continue;
      // Expiry uses only the render clock, so an event-clock offset cannot keep
      // an old boost alive. The contact itself still uses the latest event.
      slot.velocityAge = slot.pending ? 0 : slot.velocityAge + elapsed;
      slot.valid = contact(slot.x, slot.y, camera, slot.uv);
      if (slot.valid) {
        const startValid = contact(slot.previousX, slot.previousY, camera, startUv);
        if (!startValid) startUv.copy(slot.uv);
        const index = count.value++;
        segments[index].set(startUv.x, startUv.y, slot.uv.x, slot.uv.y);
        sources[index] = s; began[index] = slot.fresh ? 1 : 0; slot.fresh = false;
        velocities[index * 2] = velocities[index * 2 + 1] = 0;
        // Sweep uses render positions; speed uses INPUT timestamps. Carry the
        // event velocity across faster display frames, then expire it at rest.
        // Reproject both event points with the current camera so drift alone
        // cannot create movement. No movement is extrapolated ahead of contact.
        let speed = 0, sampleOffset = slot.historyIndex * 3;
        // Average a short event-time window to reduce timestamp jitter, using
        // a bounded ring allocated once per pointer. Keep one interval minimum.
        for (let back = 1; back < slot.historyCount; back++) {
          const candidate = ((slot.historyIndex - back + HISTORY_CAPACITY) % HISTORY_CAPACITY) * 3;
          if (back > 1 && slot.eventTime - slot.history[candidate + 2] > config.touch.velocityWindow * 1000) break;
          sampleOffset = candidate;
        }
        const eventSeconds = (slot.eventTime - slot.history[sampleOffset + 2]) / 1000;
        if (startValid && eventSeconds > 0 && slot.velocityAge < config.touch.velocityHold * 1000 &&
            contact(slot.history[sampleOffset], slot.history[sampleOffset + 1], camera, startUv)) {
          const vx = (slot.uv.x - startUv.x) * config.curtain.width / eventSeconds;
          const vy = (slot.uv.y - startUv.y) * config.curtain.height / eventSeconds;
          velocities[index * 2] = vx; velocities[index * 2 + 1] = vy;
          speed = Math.hypot(vx, vy);
        }
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
  return { segments, strengths, velocities, sources, began, count, resize, update, clear,
    setAvailable(value) { available = value; if (!value) clear(); },
    snapshot: () => ({ count: count.value, pointers: slots.filter(s => s.id !== null).map(s => ({ id: s.id, held: s.held, valid: s.valid, uv: s.uv.toArray() })) }),
    dispose() {
      clear();
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('lostpointercapture', lost); ownerWindow.removeEventListener('blur', clear);
      ownerDocument.removeEventListener('visibilitychange', visibility);
    } };
}
