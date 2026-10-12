import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, MeshBasicMaterial, Raycaster, Vector2, Vector3 } from 'three';
import { config } from '../src/config.js';
import { createCamera } from '../src/scene/camera.js';
import { createCurtainGeometry } from '../src/scene/curtainGeometry.js';
import { intersectCurtain } from '../src/interaction/curtainContact.js';
import { createPointerTracker } from '../src/interaction/PointerTracker.js';

function surface(settings, u, v) {
  return new Vector3((u - 0.5) * settings.width, v * settings.height,
    settings.bow * (1 - (2 * u - 1) ** 2) * Math.sin(Math.PI * v));
}
test('analytical contacts match both curved meshes during drift, portrait and landscape', () => {
  const settings = structuredClone(config), time = { value: 0 }, view = createCamera(settings, time);
  const result = new Vector2(), raycaster = new Raycaster();
  for (const quality of ['reference', 'reduced']) {
    settings.curtain.quality = quality;
    const mesh = new Mesh(createCurtainGeometry(settings.curtain), new MeshBasicMaterial());
    mesh.position.y = settings.curtain.height / 2; mesh.updateMatrixWorld();
    for (const aspect of [390 / 844, 844 / 390]) for (const phase of [0, 3, 9]) {
      time.value = phase; view.configure(aspect, false);
      for (const [u, v] of [[0.02, 0.02], [0.98, 0.98], [0.5, 0.5], [0.2, 0.8]]) {
        const projected = surface(settings.curtain, u, v).project(view.camera);
        raycaster.setFromCamera(projected, view.camera);
        assert.equal(intersectCurtain(raycaster.ray, settings.curtain, result), true);
        assert.ok(result.distanceTo(new Vector2(u, v)) < 1e-8);
        const actual = raycaster.intersectObject(mesh)[0];
        assert.ok(actual && actual.uv.distanceTo(result) < 1e-5);
      }
    }
    mesh.geometry.dispose(); mesh.material.dispose();
  }
});

class Surface extends EventTarget {
  captures = new Set();
  rect = { left: 0, top: 0, width: 1000, height: 1000 };
  hidden = false;
  getBoundingClientRect() { return this.rect; }
  hasPointerCapture(id) { return this.captures.has(id); }
  setPointerCapture(id) { this.captures.add(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
  send(type, id = 1, x = 500, y = 500, pointerType = 'touch', buttons = 1) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: id, clientX: x, clientY: y, pointerType, buttons, button: 0 });
    this.dispatchEvent(event);
  }
}
test('pointer IDs, current-camera reprojection, short taps and cleanup do not stick', () => {
  const settings = structuredClone(config), time = { value: 0 }, view = createCamera(settings, time);
  const canvas = new Surface(), owner = new Surface(), doc = new Surface();
  const tracker = createPointerTracker(canvas, settings, owner, doc);
  view.configure(1, false);
  canvas.send('pointerdown', 23, 450, 400); canvas.send('pointerdown', 71, 550, 600);
  tracker.update(view.camera, 1 / 60); assert.equal(tracker.count.value, 2);
  assert.deepEqual(tracker.snapshot().pointers.map(p => p.id), [23, 71]);
  time.value = 2; view.updateCamera(false); tracker.update(view.camera, 1 / 120);
  assert.ok(Math.abs(tracker.strengths[0] - settings.touch.holdStrength) < 1e-6, 'drift must not create velocity');
  canvas.send('pointercancel', 23); tracker.update(view.camera, 1 / 60); assert.equal(tracker.count.value, 1);
  canvas.send('lostpointercapture', 71); tracker.update(view.camera, 1 / 60); assert.equal(tracker.count.value, 0);
  canvas.send('pointerdown', 9); canvas.send('pointerup', 9);
  tracker.update(view.camera, 1 / 60); assert.equal(tracker.count.value, 1, 'tap survives until consumed');
  tracker.update(view.camera, 1 / 60); assert.equal(tracker.count.value, 0);
  canvas.send('pointerdown', 9); canvas.send('pointermove', 9, -5, 500);
  tracker.update(view.camera, 1 / 60); assert.equal(tracker.count.value, 0);
  canvas.send('pointermove', 9); tracker.update(view.camera, 1 / 60); assert.equal(tracker.count.value, 1);
  owner.dispatchEvent(new Event('blur')); tracker.update(view.camera, 1 / 60); assert.equal(tracker.count.value, 0);
  canvas.send('pointerdown', 9); doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));
  tracker.update(view.camera, 1 / 60); assert.equal(tracker.count.value, 0); assert.equal(canvas.captures.size, 0);
  tracker.dispose(); canvas.send('pointerdown'); tracker.update(view.camera, 1 / 60); assert.equal(tracker.count.value, 0);
});

test('swipe strength follows speed rather than refresh count, and pointer capacity is bounded', () => {
  function strength(hz) {
    const settings = structuredClone(config); settings.touch.holdStrength = 0.2; settings.touch.velocityGain = 0.02;
    const view = createCamera(settings, { value: 0 }); view.configure(1, true);
    const canvas = new Surface(), tracker = createPointerTracker(canvas, settings, new Surface(), new Surface());
    canvas.send('pointerdown'); tracker.update(view.camera, 1 / hz);
    canvas.send('pointermove', 1, 500 + 120 / hz, 500); tracker.update(view.camera, 1 / hz);
    const value = tracker.strengths[0]; tracker.dispose(); return value;
  }
  const a = strength(30), b = strength(60), c = strength(120);
  assert.ok(a > 0.2); assert.ok(Math.abs(a - b) < 0.0001 && Math.abs(b - c) < 0.0001);
  const settings = structuredClone(config), view = createCamera(settings, { value: 0 }); view.configure(1, true);
  const canvas = new Surface(), tracker = createPointerTracker(canvas, settings, new Surface(), new Surface());
  for (let id = 0; id < 15; id++) canvas.send('pointerdown', id);
  tracker.update(view.camera, 1 / 60); assert.equal(tracker.count.value, 10);
  assert.equal(canvas.captures.size, 10); tracker.dispose(); assert.equal(canvas.captures.size, 0);
});
