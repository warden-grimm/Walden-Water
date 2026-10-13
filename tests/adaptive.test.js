import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';
import { createAdaptiveResolution } from '../src/adaptiveResolution.js';

// Drive the controller with a frame-interval function for `seconds`; returns [time, scale] changes.
function run(adaptive, state, seconds, interval) {
  const changes = [];
  for (const end = state.now + seconds; state.now < end;) {
    const delta = interval(adaptive.scale);
    state.now += delta;
    if (adaptive.record(delta, state.now)) changes.push([+state.now.toFixed(2), adaptive.scale]);
  }
  return changes;
}

test('sustained overload steps 2 -> 1.5 -> 1; 57-120 Hz displays at full speed stay at 2', () => {
  for (const hz of [57, 60, 120]) {
    const adaptive = createAdaptiveResolution(config.adaptive), state = { now: 0 };
    assert.deepEqual(run(adaptive, state, 30, () => 1 / hz), [], `${hz} Hz`);
  }
  const adaptive = createAdaptiveResolution(config.adaptive), state = { now: 0 };
  const changes = run(adaptive, state, 12, () => 1 / 30);
  assert.deepEqual(changes.map(([, scale]) => scale), [1.5, 1]);
  // Sustain (2 s) plus a full 64-frame window must pass before the first step.
  assert.ok(changes[0][0] >= config.adaptive.sustain);
});

test('short hitches do not change resolution', () => {
  const adaptive = createAdaptiveResolution(config.adaptive), state = { now: 0 };
  let frame = 0;
  // One 100 ms stall every second on a 60 Hz display.
  assert.deepEqual(run(adaptive, state, 30, () => (++frame % 60 === 0 ? 0.1 : 1 / 60)), []);
});

test('recovery steps back up after headroom, and failed upgrades back off instead of oscillating', () => {
  const adaptive = createAdaptiveResolution(config.adaptive), state = { now: 0 };
  run(adaptive, state, 12, () => 1 / 30);
  assert.equal(adaptive.scale, 1);
  // Load gone: back to 1.5 after `recover` s of headroom, then to 2.
  const up = run(adaptive, state, 30, () => 1 / 60);
  assert.deepEqual(up.map(([, scale]) => scale), [1.5, 2]);
  // Resolution-dependent load: only 2x is too slow. Upgrades are retried with doubling waits.
  const flip = run(adaptive, state, 240, scale => (scale > 1.5 ? 1 / 30 : 1 / 60));
  const upgrades = flip.filter(([, scale]) => scale === 2).map(([time]) => time);
  const gaps = upgrades.slice(1).map((time, i) => time - upgrades[i]);
  // Waits grow (doubling) until they reach recover x maxBackoff, then stay there.
  const cap = config.adaptive.recover * config.adaptive.maxBackoff;
  for (let i = 1; i < gaps.length; i++) assert.ok(gaps[i] >= Math.min(gaps[i - 1] * 1.5, cap), `gaps ${gaps}`);
  assert.ok(gaps.at(-1) >= cap, `gaps ${gaps}`);
  assert.ok(upgrades.length <= 5, `${upgrades.length} upgrade attempts in 240 s`);
});

test('an upgrade that holds forgets earlier failures', () => {
  const adaptive = createAdaptiveResolution(config.adaptive), state = { now: 0 };
  run(adaptive, state, 12, () => 1 / 30);
  run(adaptive, state, 30, () => 1 / 60);
  run(adaptive, state, 120, scale => (scale > 1.5 ? 1 / 30 : 1 / 60));
  assert.ok(adaptive.snapshot().backoff > 1);
  // The load goes away: the next upgrade holds, and backoff returns to 1.
  run(adaptive, state, 150, () => 1 / 60);
  assert.equal(adaptive.scale, 2);
  assert.equal(adaptive.snapshot().backoff, 1);
});

test('disabling restores full resolution', () => {
  const settings = structuredClone(config.adaptive), adaptive = createAdaptiveResolution(settings), state = { now: 0 };
  run(adaptive, state, 12, () => 1 / 30);
  assert.equal(adaptive.scale, 1);
  settings.enabled = false;
  assert.equal(adaptive.record(1 / 30, state.now + 0.03), true);
  assert.equal(adaptive.scale, 2);
});
