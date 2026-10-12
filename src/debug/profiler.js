export function createProfiler(settings, snapshot) {
  const samples = new Float64Array(settings.capacity);
  const cpu = new Float64Array(settings.capacity), gpu = new Float64Array(settings.capacity);
  let gpuCount = 0, cpuCount = 0, gpuInvalid = '';
  function summarize(values, count) {
    if (!count) return null;
    const sorted = values.slice(0, count).sort();
    return { count, medianMs: sorted[Math.floor(count / 2)], p95Ms: sorted[Math.ceil(count * 0.95) - 1] };
  }
  let state = 'idle', started = 0, samplingAt = 0, count = 0, result = null, reason = '';
  return {
    start() { state = 'warming'; started = 0; samplingAt = 0; count = 0; gpuCount = 0; cpuCount = 0; gpuInvalid = ''; result = null; reason = ''; },
    cancel(message) {
      if (state === 'warming' || state === 'sampling') { state = 'cancelled'; reason = message; }
    },
    // No application allocations in the hot path. Sorting happens on demand after completion.
    record(timestamp, delta, cpuMs) {
      if (state === 'warming') {
        if (!started) started = timestamp;
        if (timestamp - started >= settings.warmupSeconds * 1000) { state = 'sampling'; samplingAt = timestamp; }
        return;
      }
      if (state !== 'sampling') return;
      if (count === samples.length) { state = 'cancelled'; reason = 'Sample buffer full.'; return; }
      samples[count++] = delta * 1000;
      if (Number.isFinite(cpuMs)) cpu[cpuCount++] = cpuMs;
      if (timestamp - samplingAt >= settings.sampleSeconds * 1000) state = 'complete';
    },
    recordGpu(timestamp, ms) {
      if (state === 'sampling' && timestamp > samplingAt && !gpuInvalid && gpuCount < gpu.length) gpu[gpuCount++] = ms;
    },
    invalidateGpu(message) {
      if (state === 'sampling' || state === 'warming') { gpuInvalid = message; gpuCount = 0; }
    },
    status() {
      if (state === 'complete' && !result) {
        const ordered = samples.slice(0, count).sort();
        result = {
          ...snapshot(), warmupSeconds: settings.warmupSeconds, sampleSeconds: settings.sampleSeconds,
          count, medianMs: ordered[Math.floor(count / 2)], p95Ms: ordered[Math.ceil(count * 0.95) - 1],
          rawFrameTimesMs: Array.from(samples.subarray(0, count)),
          renderCost: { cpuSubmit: summarize(cpu, cpuCount), gpu: summarize(gpu, gpuCount), gpuInvalid,
            note: 'CPU is renderer.render submission only, not GPU completion. GPU uses asynchronous elapsed queries; unavailable/disjoint falls back to CPU.' },
        };
      }
      return { state, count, reason, result };
    },
  };
}
