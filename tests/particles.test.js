import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector4 } from 'three';
import { config } from '../src/config.js';
import { POINTER_CAPACITY } from '../src/interaction/PointerTracker.js';
import { createSplashEmitter } from '../src/interaction/SplashEmitter.js';
import { ballisticY, impactTime, POOL_HEIGHT } from '../src/scene/ballistics.js';

// Minimal stand-in for the tracker's per-frame contact arrays.
function fakePointers() {
  return { count: { value: 0 }, segments: Array.from({ length: POINTER_CAPACITY }, () => new Vector4()),
    velocities: new Float32Array(POINTER_CAPACITY * 2), sources: new Uint8Array(POINTER_CAPACITY), began: new Uint8Array(POINTER_CAPACITY) };
}
function contact(pointers, index, { u = 0.5, v = 0.5, vx = 0, vy = 0, began = 0, source = index } = {}) {
  pointers.count.value = Math.max(pointers.count.value, index + 1);
  pointers.segments[index].set(u, v, u, v);
  pointers.velocities[index * 2] = vx; pointers.velocities[index * 2 + 1] = vy;
  pointers.began[index] = began; pointers.sources[index] = source;
}
const texel = (emitter, row, slot) => Array.from(emitter.uniform.value.image.data.subarray((row * emitter.slots + slot) * 4, (row * emitter.slots + slot) * 4 + 4));

test('impact time lands every trajectory exactly on the pool surface', () => {
  for (const [y0, vy, g] of [[3, 1.2, 4.2], [6, -0.3, 4.2], [0, 1.5, 9.8], [2.5, 0, 2]]) {
    const t = impactTime(y0, vy, g);
    assert.ok(t >= 0);
    assert.ok(Math.abs(ballisticY(y0, vy, g, t) - POOL_HEIGHT) < 1e-9);
    // Later root: the droplet is above the pool just before landing.
    if (t > 1e-3) assert.ok(ballisticY(y0, vy, g, t - 1e-3) > POOL_HEIGHT);
  }
  assert.equal(impactTime(0, -1, 4), 0, 'a downward launch at the surface lands immediately');
});

test('a held finger splashes once; it does not keep emitting', () => {
  const settings = structuredClone(config), pointers = fakePointers(), emitter = createSplashEmitter(settings, pointers);
  contact(pointers, 0, { began: 1 });
  emitter.update(0);
  contact(pointers, 0, { began: 0 });
  for (let frame = 1; frame <= 600; frame++) emitter.update(frame / 120);
  assert.equal(emitter.snapshot().emitted, 1);
  assert.ok(Math.abs(texel(emitter, 1, 0)[3] - settings.bursts.press) < 1e-6);
  emitter.dispose();
});

test('swipes emit directional bursts at a bounded, refresh-independent rate', () => {
  const counts = [];
  for (const hz of [60, 120, 240]) {
    const settings = structuredClone(config), pointers = fakePointers(), emitter = createSplashEmitter(settings, pointers);
    contact(pointers, 0, { vx: 2.5, vy: 0 });
    for (let frame = 0; frame < hz; frame++) emitter.update(frame / hz);
    counts.push(emitter.snapshot().emitted);
    const [vx, , vz, strength] = texel(emitter, 1, 0);
    assert.ok(vx > 0 && vz > 0, 'thrown along the drag and toward the camera');
    assert.ok(strength > 0 && strength < 1);
    emitter.dispose();
  }
  // Limited by bursts.interval, not by display refresh.
  for (const count of counts) assert.ok(count <= Math.ceil(1 / config.bursts.interval) + 1);
  assert.ok(Math.max(...counts) - Math.min(...counts) <= Math.ceil(counts[0] * 0.25));
  const slow = fakePointers(), emitter = createSplashEmitter(structuredClone(config), slow);
  contact(slow, 0, { vx: config.bursts.minSpeed * 0.5 });
  for (let frame = 0; frame < 120; frame++) emitter.update(frame / 60);
  assert.equal(emitter.snapshot().emitted, 0, 'slow drags part the water without spraying');
  emitter.dispose();
});

test('ten fingers swiping for a minute stay within the fixed ring', () => {
  const settings = structuredClone(config), pointers = fakePointers(), emitter = createSplashEmitter(settings, pointers);
  for (let i = 0; i < POINTER_CAPACITY; i++) contact(pointers, i, { u: (i + 0.5) / POINTER_CAPACITY, vx: 6, vy: -3 });
  for (let frame = 0; frame < 60 * 60; frame++) emitter.update(frame / 60);
  const state = emitter.snapshot();
  assert.ok(state.live <= settings.bursts.slots);
  assert.ok(state.overwritten > 0, 'stress recycles the oldest live burst');
  assert.equal(emitter.uniform.value.image.data.length, settings.bursts.slots * 8, 'no ring growth');
  for (const value of emitter.uniform.value.image.data) assert.ok(Number.isFinite(value));
  emitter.dispose();
});

test('burst origin lies on the resting curtain and slot rebuild resets the ring', () => {
  const settings = structuredClone(config), pointers = fakePointers(), emitter = createSplashEmitter(settings, pointers);
  contact(pointers, 0, { u: 0.25, v: 0.75, began: 1 });
  emitter.update(1);
  const [x, y, z, start] = texel(emitter, 0, 0);
  assert.ok(Math.abs(x - (0.25 - 0.5) * settings.curtain.width) < 1e-5);
  assert.ok(Math.abs(y - 0.75 * settings.curtain.height) < 1e-5);
  assert.ok(Math.abs(z - settings.curtain.bow * 0.75 * Math.sin(Math.PI * 0.75)) < 1e-5);
  assert.equal(start, 1);
  const previous = emitter.uniform.value;
  settings.bursts.slots = 32; emitter.configure();
  assert.notEqual(emitter.uniform.value, previous);
  assert.equal(emitter.slots, 32);
  assert.equal(emitter.snapshot().live, 0);
  settings.bursts.enabled = false; emitter.update(2);
  assert.equal(emitter.snapshot().emitted, 1, 'disabled bursts emit nothing');
  emitter.dispose();
});
