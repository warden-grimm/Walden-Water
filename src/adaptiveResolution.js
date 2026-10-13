// Adaptive resolution (M8). The pixel-ratio cap steps high -> mid -> low
// (2 -> 1.5 -> 1) when the mean frame interval runs over budget for `sustain`
// seconds, and back up one step after `recover` seconds with headroom. If an upgrade overloads
// again within the recovery time, the next wait doubles (up to `maxBackoff`),
// so the level cannot oscillate. Fixed typed buffers: no per-frame allocation.
const WINDOW = 64; // most recent frame intervals considered

export function createAdaptiveResolution(settings) {
  const deltas = new Float32Array(WINDOW), sorted = new Float32Array(WINDOW);
  let count = 0, head = 0, level = 0, backoff = 1, holding = false; // holding: the last change was an upgrade
  let overSince = -1, underSince = -1, changedAt = -Infinity, upgradedAt = -Infinity, evaluatedAt = -Infinity;
  let mean = 0, budget = 0;
  const levels = () => [settings.high, settings.mid, settings.low];
  function clearWindow() { count = 0; head = 0; overSince = underSince = -1; }
  // Higher level index = lower resolution. A step down soon after a step up
  // means the upgrade failed: wait longer before trying again.
  function change(next, now) {
    if (next > level && now - upgradedAt < settings.recover) backoff = Math.min(backoff * 2, settings.maxBackoff);
    if (next < level) upgradedAt = now;
    holding = next < level;
    level = next; changedAt = now; clearWindow();
    return true;
  }
  return {
    get scale() { return levels()[level]; },
    // Feed one frame interval (seconds) at time `now` (seconds). Returns true
    // when the level changed and the renderer should resize.
    record(delta, now) {
      if (!settings.enabled) return level !== 0 ? change(0, now) : false;
      if (!(delta > 0) || now - changedAt < settings.settle) return false;
      deltas[head] = delta; head = (head + 1) % WINDOW; count = Math.min(count + 1, WINDOW);
      // Evaluate twice a second once the window is full.
      if (count < WINDOW || now - evaluatedAt < 0.5) return false;
      evaluatedAt = now;
      // An upgrade that has held for the recovery time succeeded: forget past failures.
      if (holding && backoff > 1 && now - upgradedAt >= settings.recover) backoff = 1;
      // The mean interval (1 / fps), not the median: rAF timestamps snap to
      // vsync, so a frame rate lost to dropped frames can keep the median at
      // the display interval. Isolated hitches barely move the mean.
      mean = 0;
      for (let i = 0; i < WINDOW; i++) mean += deltas[i];
      mean /= WINDOW;
      sorted.set(deltas); sorted.sort();
      // The display interval, estimated from fast frames, bounded so a 120 Hz
      // display still targets 60 fps and an already-slow start still counts as slow.
      budget = Math.min(Math.max(sorted[Math.floor(WINDOW * 0.1)], 1 / settings.targetFps), 1 / settings.minRefreshHz);
      if (mean > budget * settings.overloadRatio) {
        underSince = -1;
        if (overSince < 0) overSince = now;
        if (now - overSince >= settings.sustain && level < 2) return change(level + 1, now);
      } else if (mean <= budget * settings.headroomRatio) {
        overSince = -1;
        if (underSince < 0) underSince = now;
        if (now - underSince >= settings.recover * backoff && level > 0) return change(level - 1, now);
      } else overSince = underSince = -1;
      return false;
    },
    // Pauses and viewport changes restart measurement without changing the level.
    reset() { clearWindow(); evaluatedAt = -Infinity; },
    snapshot: () => ({ enabled: settings.enabled, level, scale: levels()[level], backoff,
      meanMs: mean * 1000, budgetMs: budget * 1000 }),
  };
}
