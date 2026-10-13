import { AdditiveBlending, Mesh, NoBlending, PlaneGeometry, ShaderMaterial } from 'three';
import { choices } from '../config.js';
import vertexShader from '../shaders/background.vert.glsl?raw';
import fragmentSource from '../shaders/shaft.frag.glsl?raw';
import noise from '../shaders/noise.glsl?raw';
import { assemble } from './shaderChunks.js';
import { POOL_HEIGHT } from './ballistics.js';

// Visible beam as two fullscreen passes over one shader: the ray segment
// BEHIND the curtain draws before the water (so the translucent sheet dims
// it), the segment in FRONT draws after it. Both integrate the shared light.
export function createLightShaft(config, time, light, camera, sceneDepth) {
  const shared = { ...light.uniforms, uTime: time, uSceneDepth: sceneDepth,
    // Live references: camera drift/resize update these in place, no per-frame copies.
    uProjectionInverse: { value: camera.projectionMatrixInverse }, uCameraWorld: { value: camera.matrixWorld },
    uCameraFar: { value: 0 }, uCurtainWidth: { value: 0 }, uCurtainHeight: { value: 0 }, uCurtainBow: { value: 0 },
    uCurtainEdgeUv: { value: 0 }, uBehindCurtain: { value: 1 }, uPoolHeight: { value: POOL_HEIGHT }, uPoolClip: { value: true },
    uView: { value: 0 }, uLacunarity: { value: 0 }, uGain: { value: 0 } };
  const bindings = { uIntensity: 'intensity', uCore: 'core', uSamples: 'samples', uSoftDepth: 'softDepth', uNoise: 'noise',
    uNoiseScale: 'noiseScale', uDrift: 'drift', uStreaks: 'streaks', uStreakScale: 'streakScale', uStreakDrift: 'streakDrift' };
  for (const name of Object.keys(bindings)) shared[name] = { value: 0 };
  const fragmentShader = assemble(fragmentSource).replace('// __NOISE__', noise);
  const geometry = new PlaneGeometry(1, 1);
  const passes = [0, 1].map(part => {
    const material = new ShaderMaterial({ uniforms: { ...shared, uPart: { value: part } }, vertexShader, fragmentShader,
      transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending, premultipliedAlpha: true });
    const mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    // Background is -1, curtain 1, particles 3+.
    mesh.renderOrder = part === 0 ? 0 : 2.5;
    mesh.name = part === 0 ? 'shaft behind curtain' : 'shaft in front';
    return mesh;
  });
  function configure() {
    const s = config.shaft;
    for (const [name, key] of Object.entries(bindings)) shared[name].value = s[key];
    shared.uCameraFar.value = config.camera.far;
    shared.uCurtainWidth.value = config.curtain.width; shared.uCurtainHeight.value = config.curtain.height; shared.uCurtainBow.value = config.curtain.bow;
    shared.uCurtainEdgeUv.value = config.water.edgeWidth;
    // With the pool enabled, rays end at the water surface as well as at the rock.
    shared.uPoolClip.value = config.pool.enabled;
    shared.uLacunarity.value = s.lacunarity; shared.uGain.value = s.gain;
    shared.uView.value = choices.shaft.view.indexOf(s.view);
    // Debug views replace the frame so depth/segment values read directly.
    const blending = shared.uView.value === 0 ? AdditiveBlending : NoBlending;
    for (const mesh of passes) {
      mesh.visible = s.enabled;
      if (mesh.material.blending !== blending) { mesh.material.blending = blending; mesh.material.needsUpdate = true; }
    }
  }
  return { objects: passes, configure,
    snapshot: () => ({ enabled: config.shaft.enabled, view: config.shaft.view, samples: config.shaft.samples,
      depthSource: sceneDepth.value ? 'wall capture DepthTexture (MSAA resolved)' : 'missing' }),
    dispose() { geometry.dispose(); for (const mesh of passes) mesh.material.dispose(); } };
}
