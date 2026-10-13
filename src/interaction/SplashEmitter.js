import { DataTexture, FloatType, NearestFilter, NoColorSpace, RGBAFormat, Vector3 } from 'three';
import { POINTER_CAPACITY } from './PointerTracker.js';
import { curtainPoint } from '../scene/ballistics.js';

// Fixed ring of touch-burst descriptors in a slots×2 RGBA32F texture:
//   row 0, texel i: launch origin xyz (world m), start time (shared clock; <0 = empty)
//   row 1, texel i: launch velocity xyz (m/s), strength [0,1]
// The droplet shader and the M7 pool read the same texels; nothing is read back.
// A full ring overwrites the oldest burst, so held or many fingers stay bounded.
export function createSplashEmitter(config, pointers) {
  const settings = config.bursts;
  const lastEmit = new Float64Array(POINTER_CAPACITY);
  // Contact UV at each finger's last splash: emission also needs real travel,
  // so a held finger's jitter cannot read as a stream of tiny swipes.
  const anchors = new Float32Array(POINTER_CAPACITY * 2);
  const origin = new Vector3();
  let slots = 0, data, texture, next = 0, emitted = 0, overwritten = 0, now = 0;
  function allocate() {
    texture?.dispose();
    slots = settings.slots;
    data = new Float32Array(slots * 2 * 4);
    texture = new DataTexture(data, slots, 2, RGBAFormat, FloatType);
    texture.colorSpace = NoColorSpace;
    texture.minFilter = texture.magFilter = NearestFilter;
    texture.generateMipmaps = false;
    uniform.value = texture;
    clear();
  }
  function clear() {
    for (let i = 0; i < slots; i++) data[i * 4 + 3] = -1;
    next = 0; lastEmit.fill(-Infinity); texture.needsUpdate = true;
  }
  function emit(time, u, v, vx, vy, vz, strength) {
    const start = data[next * 4 + 3];
    if (start >= 0 && time - start < settings.lifetime) overwritten++;
    curtainPoint(config.curtain, u, v, origin);
    const a = next * 4, b = (slots + next) * 4;
    data[a] = origin.x; data[a + 1] = origin.y; data[a + 2] = origin.z; data[a + 3] = time;
    data[b] = vx; data[b + 1] = vy; data[b + 2] = vz; data[b + 3] = strength;
    next = (next + 1) % slots; emitted++;
    texture.needsUpdate = true;
  }
  function update(time) {
    now = time;
    if (!settings.enabled) return;
    const s = settings, water = config.water;
    for (let i = 0; i < pointers.count.value; i++) {
      const finger = pointers.sources[i];
      const u = pointers.segments[i].z, v = pointers.segments[i].w;
      const dragX = pointers.velocities[i * 2], dragY = pointers.velocities[i * 2 + 1];
      const speed = Math.hypot(dragX, dragY);
      const travel = Math.hypot((u - anchors[finger * 2]) * config.curtain.width, (v - anchors[finger * 2 + 1]) * config.curtain.height);
      let strength;
      if (pointers.began[i]) strength = s.press; // A new contact splashes once, even when held.
      else if (speed >= s.minSpeed && travel >= s.spacing && time - lastEmit[finger] >= s.interval)
        strength = Math.min(1, Math.max(0, (speed - s.minSpeed) / Math.max(s.fullSpeed - s.minSpeed, 1e-3)));
      else continue;
      lastEmit[finger] = time; anchors[finger * 2] = u; anchors[finger * 2 + 1] = v;
      // Local falling-water speed (the curtain's accelerated flow) carries
      // struck droplets downward; drag throws them along the swipe and the
      // finger kicks them off the sheet toward the camera.
      const fall = water.flowSpeed * Math.sqrt(water.lipSpeed ** 2 + 2 * water.gravity * (1 - v) * config.curtain.height);
      const kick = s.minShare + (1 - s.minShare) * strength;
      emit(time, u, v, dragX * s.throw, dragY * s.throw + s.lift * kick - fall * s.carry, s.outward * kick, strength);
    }
  }
  const uniform = { value: null };
  allocate();
  return { uniform, update, clear,
    configure() { if (settings.slots !== slots) allocate(); else if (!settings.enabled) clear(); },
    contextRestored() { texture.needsUpdate = true; },
    get slots() { return slots; },
    snapshot() {
      let live = 0;
      for (let i = 0; i < slots; i++) { const start = data[i * 4 + 3]; if (start >= 0 && now - start < settings.lifetime) live++; }
      return { slots, perBurst: settings.perBurst, live, emitted, overwritten, maxDroplets: slots * settings.perBurst };
    },
    dispose() { texture.dispose(); uniform.value = null; } };
}
