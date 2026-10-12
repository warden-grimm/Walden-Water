import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { config } from '../src/config.js';
import { createCamera } from '../src/scene/camera.js';
import { wallSize } from '../src/scene/framing.js';
import { createLight } from '../src/scene/light.js';
import { createRenderTimer } from '../src/debug/renderTimer.js';

test('wall covers frustum at farthest displaced depth, including ultrawide and maximum drift', () => {
  const settings = structuredClone(config);
  settings.camera.driftX = settings.camera.driftY = 0.05;
  settings.wall.width = 6; settings.wall.height = 8;
  const time = { value: 0 }, view = createCamera(settings, time);
  const farZ = settings.wall.depth - settings.rock.relief - settings.rock.ledgeDepth;
  for (const aspect of [390 / 844, 844 / 390, 16 / 9, 32 / 9, 6]) {
    const size = wallSize(aspect, settings);
    view.configure(aspect, false);
    for (let t = 0; t < 120; t += 0.25) {
      time.value = t; view.updateCamera(false);
      for (const x of [-1, 1]) for (const y of [-1, 1]) {
        const direction = new Vector3(x, y, 0.5).unproject(view.camera).sub(view.camera.position).normalize();
        const hit = direction.multiplyScalar((farZ - view.camera.position.z) / direction.z).add(view.camera.position);
        assert.ok(Math.abs(hit.x) < size.width / 2);
        assert.ok(Math.abs(hit.y - settings.curtain.height / 2) + settings.rock.overhang < size.height / 2);
      }
    }
  }
});

test('shared light preserves uniform identity and finite ordered cone/fade when tuned', () => {
  const settings = { ...config.light }, light = createLight(settings);
  const axis = light.uniforms.uLightDirection;
  assert.ok(Math.abs(axis.value.length() - 1) < 1e-12);
  assert.ok(axis.value.x > 0 && axis.value.y < 0 && axis.value.z < 0);
  settings.x = -5; settings.range = 3; settings.fadeStart = 15;
  light.configure();
  assert.equal(light.uniforms.uLightDirection, axis);
  assert.ok(light.uniforms.uLightCosOuter.value < light.uniforms.uLightCosInner.value);
  assert.ok(light.uniforms.uLightFadeStart.value < light.uniforms.uLightRange.value);
});

test('GPU timer waits for availability, rejects disjoint data, restores pool and supports CPU-only fallback', () => {
  let available = false, disjoint = false, created = 0, deleted = 0, reads = 0, invalid = 0;
  const accepted = [], ext = { TIME_ELAPSED_EXT: 1, GPU_DISJOINT_EXT: 2 };
  const gl = { QUERY_RESULT_AVAILABLE: 3, QUERY_RESULT: 4,
    getExtension: () => ext, createQuery: () => ++created, deleteQuery: () => deleted++,
    beginQuery() {}, endQuery() {}, getParameter: () => disjoint,
    getQueryParameter(query, parameter) {
      if (parameter === 3) return available;
      assert.ok(available); reads++; return 2000000;
    } };
  const timer = createRenderTimer(gl, 2, (timestamp, ms) => accepted.push([timestamp, ms]), () => invalid++);
  timer.begin(100); timer.end(); timer.begin(116); timer.end();
  assert.equal(reads, 0); assert.equal(created, 2);
  available = true; timer.begin(132); timer.end();
  assert.deepEqual(accepted, [[100, 2], [116, 2]]);
  disjoint = true; timer.begin(148); timer.end();
  assert.equal(reads, 2); assert.equal(invalid, 1);
  timer.contextLost(); timer.restore(); assert.equal(created, 4);
  timer.dispose(); assert.equal(deleted, 2); // lost-context objects are already invalid.
  gl.getExtension = () => null;
  const fallback = createRenderTimer(gl, 2, () => assert.fail(), () => assert.fail());
  fallback.begin(200); fallback.end(); assert.equal(fallback.supported, false);
  assert.ok(fallback.cpuMs >= 0); fallback.dispose();
});
