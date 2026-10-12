export function createProfiler(settings, snapshot) {
  const samples = new Float64Array(settings.capacity);
  let state = 'idle', started = 0, samplingAt = 0, count = 0, result = null, reason = '';
  return {
    start() { state = 'warming'; started = 0; samplingAt = 0; count = 0; result = null; reason = ''; },
    cancel(message) {
      if (state === 'warming' || state === 'sampling') { state = 'cancelled'; reason = message; }
    },
    // No application allocations in the hot path. Sorting happens on demand after completion.
    record(timestamp, delta) {
      if (state === 'warming') {
        if (!started) started = timestamp;
        if (timestamp - started >= settings.warmupSeconds * 1000) { state = 'sampling'; samplingAt = timestamp; }
        return;
      }
      if (state !== 'sampling') return;
      if (count === samples.length) { state = 'cancelled'; reason = 'Sample buffer full.'; return; }
      samples[count++] = delta * 1000;
      if (timestamp - samplingAt >= settings.sampleSeconds * 1000) state = 'complete';
    },
    status() {
      if (state === 'complete' && !result) {
        const ordered = samples.slice(0, count).sort();
        result = {
          ...snapshot(), warmupSeconds: settings.warmupSeconds, sampleSeconds: settings.sampleSeconds,
          count, medianMs: ordered[Math.floor(count / 2)], p95Ms: ordered[Math.ceil(count * 0.95) - 1],
          rawFrameTimesMs: Array.from(samples.subarray(0, count)),
        };
      }
      return { state, count, reason, result };
    },
  };
}
