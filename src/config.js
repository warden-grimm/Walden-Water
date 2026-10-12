// World units are metres. The curtain runs from y=0 (future pool) to its lip.
// M1 exposes only implemented controls; later milestones extend these groups.
export const config = {
  renderer: { background: '#070b10', exposure: 1, maxDpr: 2 },
  camera: {
    fov: 42, near: 0.1, far: 100, frameFill: 0.84,
    drift: true, driftX: 0.025, driftY: 0.015, driftSpeed: 0.35, verticalRate: 0.73,
  },
  wall: { width: 20, height: 12, depth: -0.6, color: '#17232c' },
  curtain: { width: 2.8, height: 6, color: '#88adb7', opacity: 0.28 },
  markers: { color: '#819598', opacity: 0.6, thickness: 0.018, overhang: 0.16, depth: 0.01 },
  timing: { maxDelta: 0.05 },
  // Fixed measurement protocol, deliberately not adjustable mid-sample.
  diagnostics: { warmupSeconds: 10, sampleSeconds: 60, capacity: 24000, refreshMs: 500 },
};

// Numeric GUI ranges live beside defaults, keeping tuning in one place.
export const ranges = {
  renderer: { exposure: [0.1, 2, 0.01], maxDpr: [0.5, 2, 0.1] },
  camera: {
    fov: [25, 65, 1], near: [0.01, 0.5, 0.01], far: [30, 200, 1], frameFill: [0.5, 0.9, 0.01],
    driftX: [0, 0.05, 0.001], driftY: [0, 0.05, 0.001], driftSpeed: [0.05, 1, 0.01], verticalRate: [0.1, 1, 0.01],
  },
  wall: { width: [6, 30, 0.1], height: [8, 20, 0.1], depth: [-2, -0.1, 0.01] },
  curtain: { width: [1, 4, 0.1], height: [3, 8, 0.1], opacity: [0.05, 0.8, 0.01] },
  markers: { opacity: [0, 1, 0.01], thickness: [0.005, 0.05, 0.001], overhang: [0, 0.4, 0.01], depth: [0.001, 0.05, 0.001] },
  timing: { maxDelta: [0.016, 0.1, 0.001] },
};
