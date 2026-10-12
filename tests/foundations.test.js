import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';
import { createTimeline } from '../src/time.js';
import { createScene } from '../src/scene/createScene.js';
import { Vector3 } from 'three';
import { createProfiler } from '../src/debug/profiler.js';

test('shared timeline excludes hidden time and clamps stalled frames', () => {
  const clock = createTimeline(config.timing);
  clock.tick(1000);
  clock.tick(1016);
  assert.equal(clock.uniform.value, 0.016);
  clock.pause();
  clock.tick(20000);
  assert.equal(clock.uniform.value, 0.016);
  clock.tick(22000);
  assert.equal(clock.uniform.value, 0.066);
});

test('lip and pool corners stay inside framing at all breathing phases', () => {
  const time = { value: 0 };
  const world = createScene(config, time);
  for (const [width, height] of [[390, 844], [844, 390], [1440, 900]]) {
    world.configure(width / height, false);
    for (let seconds = 0; seconds < 120; seconds += 0.25) {
      time.value = seconds;
      world.updateCamera(false);
      for (const x of [-1, 1]) for (const y of [0, config.curtain.height]) {
        const corner = new Vector3(x * (config.curtain.width / 2 + config.markers.overhang), y, config.markers.depth).project(world.camera);
        assert.ok(Math.abs(corner.x) < 0.91 && Math.abs(corner.y) < 0.91);
      }
    }
  }
  world.updateCamera(true);
  assert.equal(world.camera.position.x, 0);
  assert.equal(world.camera.position.y, config.curtain.height / 2);
  world.dispose();
});

test('frame sampler excludes warmup, reports percentiles, and rejects interrupted runs', () => {
  const profiler = createProfiler({ warmupSeconds: 10, sampleSeconds: 60, capacity: 4000 }, () => ({ test: true }));
  profiler.start();
  for (let t = 100; t <= 70100; t += 20) profiler.record(t, 0.02);
  const completed = profiler.status();
  assert.equal(completed.state, 'complete');
  assert.equal(completed.result.count, 3000);
  assert.equal(completed.result.medianMs, 20);
  assert.equal(completed.result.p95Ms, 20);
  profiler.start();
  profiler.cancel('hidden');
  profiler.record(90000, 2);
  assert.equal(profiler.status().state, 'cancelled');
  assert.equal(profiler.status().result, null);
});
