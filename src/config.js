// World units are metres; +Y is up, camera is on +Z, pool is y=0.
export const config = {
  renderer: { background: '#070b10', exposure: 1, maxDpr: 2 },
  camera: { fov: 42, near: 0.1, far: 100, frameFill: 0.84, drift: true, driftX: 0.025, driftY: 0.015, driftSpeed: 0.35, verticalRate: 0.73 },
  wall: { width: 20, height: 12, depth: -0.6, padding: 0.4, quality: 'reference', referenceSegments: 256, reducedSegments: 128, displacement: true, view: 'rock' },
  rock: { color: '#525c66', relief: 0.65, scale: 0.7, ridgeMix: 0.55, lacunarity: 2.03, gain: 0.5,
    strataFrequency: 7, strataWarp: 8, ledgeDepth: 0.3, ledgeSharpness: 4, overhang: 0.12, normalStep: 0.015,
    albedoScale: 8, albedoVariation: 0.4, mossColor: '#354737', moss: 0.22, mossThreshold: 0.35, mossSoftness: 0.3, creviceShade: 0.6 },
  wet: { sheen: true, margin: 0.65, frequency: 6, threshold: 0.38, softness: 0.3,
    trickleSpeed: 0.35, trickleFrequency: 11, trickleContrast: 0.85, specular: 0.4, drySpecular: 0.015, gloss: 55 },
  light: { x: -3.5, y: 8, z: 3, targetX: 0, targetY: 4, targetZ: 0,
    angle: 21, penumbra: 0.55, intensity: 1.5, color: '#fff1d5', range: 10, fadeStart: 6,
    bounce: 0.25, bounceColor: '#b3c1cd' },
  curtain: { width: 2.8, height: 6, color: '#88adb7', opacity: 0.28 },
  markers: { color: '#819598', opacity: 0.6, thickness: 0.018, overhang: 0.16, depth: 0.01 },
  timing: { maxDelta: 0.05 },
  // Fixed diagnostic protocol, not adjustable mid-sample; buffers allocated only in debug.
  diagnostics: { warmupSeconds: 10, sampleSeconds: 60, capacity: 24000, refreshMs: 500, querySlots: 8 },
};
export const choices = { wall: { quality: ['reference', 'reduced'], view: ['rock', 'normals', 'light mask', 'wet mask'] } };
export const rebuildControls = new Set(['quality', 'referenceSegments', 'reducedSegments']);
export const ranges = {
  renderer: { exposure: [0.1, 2, 0.01], maxDpr: [0.5, 2, 0.1] },
  camera: { fov: [25, 65, 1], near: [0.01, 0.5, 0.01], far: [30, 200, 1], frameFill: [0.5, 0.9, 0.01], driftX: [0, 0.05, 0.001], driftY: [0, 0.05, 0.001], driftSpeed: [0.05, 1, 0.01], verticalRate: [0.1, 1, 0.01] },
  wall: { width: [6, 30, 0.1], height: [8, 20, 0.1], depth: [-2, -0.1, 0.01], padding: [0.1, 2, 0.1], referenceSegments: [32, 256, 32], reducedSegments: [32, 128, 16] },
  rock: { relief: [0, 1.5, 0.01], scale: [0.1, 2, 0.01], ridgeMix: [0, 1, 0.01], lacunarity: [1.1, 3, 0.01], gain: [0.1, 0.8, 0.01], strataFrequency: [1, 12, 0.1], strataWarp: [0, 16, 0.1], ledgeDepth: [0, 0.8, 0.01], ledgeSharpness: [1, 8, 0.1], overhang: [0, 0.3, 0.01], normalStep: [0.005, 0.05, 0.001], albedoScale: [1, 20, 0.1], albedoVariation: [0, 0.8, 0.01], moss: [0, 0.5, 0.01], mossThreshold: [0, 0.7, 0.01], mossSoftness: [0.05, 0.5, 0.01], creviceShade: [0, 0.9, 0.01] },
  wet: { margin: [0.1, 2, 0.01], frequency: [1, 16, 0.1], threshold: [0, 0.7, 0.01], softness: [0.05, 0.5, 0.01], trickleSpeed: [0, 1, 0.01], trickleFrequency: [1, 20, 0.1], trickleContrast: [0, 1, 0.01], specular: [0, 2, 0.01], drySpecular: [0, 0.1, 0.001], gloss: [10, 120, 1] },
  light: { x: [-8, -1, 0.1], y: [6, 12, 0.1], z: [1, 6, 0.1], targetX: [-2, 2, 0.1], targetY: [2, 6, 0.1], targetZ: [-2, 1, 0.1], angle: [5, 40, 1], penumbra: [0.05, 0.95, 0.01], intensity: [0, 4, 0.01], range: [3, 16, 0.1], fadeStart: [0, 15, 0.1], bounce: [0, 0.5, 0.01] },
  curtain: { width: [1, 4, 0.1], height: [3, 8, 0.1], opacity: [0, 0.8, 0.01] },
  markers: { opacity: [0, 1, 0.01], thickness: [0.005, 0.05, 0.001], overhang: [0, 0.4, 0.01], depth: [0.001, 0.05, 0.001] },
  timing: { maxDelta: [0.016, 0.1, 0.001] },
};
