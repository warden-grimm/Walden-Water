// This is the only simulation clock. Reset the timestamp, not elapsed time, on pause.
export function createTimeline(settings) {
  const uniform = { value: 0 };
  let previous;
  return {
    uniform,
    tick(timestamp) {
      const rawDelta = previous === undefined ? 0 : Math.max(0, (timestamp - previous) / 1000);
      previous = timestamp;
      uniform.value += Math.min(rawDelta, settings.maxDelta);
      return rawDelta;
    },
    pause() { previous = undefined; },
  };
}
