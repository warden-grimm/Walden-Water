import { Color, DoubleSide, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from 'three';
import vertexSource from '../shaders/wall.vert.glsl?raw';
import fragmentSource from '../shaders/wall.frag.glsl?raw';
import noise from '../shaders/noise.glsl?raw';
import lightSource from '../shaders/light.glsl?raw';
import { wallSize } from './framing.js';

export function createWall(config, time, light) {
  const uniforms = { ...light.uniforms, uTime: time, uWallSize: { value: new Vector2() } };
  const bindings = {
    uDisplacement: ['wall', 'displacement'], uRelief: ['rock', 'relief'], uRockScale: ['rock', 'scale'],
    uRidgeMix: ['rock', 'ridgeMix'], uLacunarity: ['rock', 'lacunarity'], uGain: ['rock', 'gain'],
    uStrataFrequency: ['rock', 'strataFrequency'], uStrataWarp: ['rock', 'strataWarp'],
    uLedgeDepth: ['rock', 'ledgeDepth'], uLedgeSharpness: ['rock', 'ledgeSharpness'], uOverhang: ['rock', 'overhang'], uNormalStep: ['rock', 'normalStep'], uRockColor: ['rock', 'color'],
    uAlbedoScale: ['rock', 'albedoScale'], uAlbedoVariation: ['rock', 'albedoVariation'],
    uMossColor: ['rock', 'mossColor'], uMoss: ['rock', 'moss'], uMossThreshold: ['rock', 'mossThreshold'],
    uMossSoftness: ['rock', 'mossSoftness'], uCreviceShade: ['rock', 'creviceShade'],
    uBounce: ['light', 'bounce'], uBounceColor: ['light', 'bounceColor'], uWetSheen: ['wet', 'sheen'],
    uCurtainWidth: ['curtain', 'width'], uWetMargin: ['wet', 'margin'], uWetFrequency: ['wet', 'frequency'],
    uWetThreshold: ['wet', 'threshold'], uWetSoftness: ['wet', 'softness'], uTrickleSpeed: ['wet', 'trickleSpeed'],
    uTrickleFrequency: ['wet', 'trickleFrequency'], uTrickleContrast: ['wet', 'trickleContrast'],
    uWetSpecular: ['wet', 'specular'], uDrySpecular: ['wet', 'drySpecular'], uGloss: ['wet', 'gloss'],
  };
  for (const [name, [group, key]] of Object.entries(bindings)) {
    const value = config[group][key];
    uniforms[name] = { value: typeof value === 'string' ? new Color(value) : value };
  }
  uniforms.uView = { value: 0 };
  const material = new ShaderMaterial({ uniforms, side: DoubleSide,
    vertexShader: vertexSource.replace('// __NOISE__', noise),
    fragmentShader: fragmentSource.replace('// __NOISE__', noise).replace('// __LIGHT__', lightSource) });
  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  // The GPU displaces beyond CPU bounds; this backdrop must not be CPU culled.
  mesh.frustumCulled = false;
  let segments = 0;
  function configure(aspect) {
    const next = config.wall[`${config.wall.quality}Segments`];
    if (next !== segments) {
      const previous = mesh.geometry;
      mesh.geometry = new PlaneGeometry(1, 1, next, next);
      previous.dispose();
      segments = next;
    }
    const size = wallSize(aspect, config);
    uniforms.uWallSize.value.set(size.width, size.height);
    mesh.position.set(0, config.curtain.height / 2, config.wall.depth);
    for (const [name, [group, key]] of Object.entries(bindings)) {
      const value = config[group][key];
      if (typeof value === 'string') uniforms[name].value.set(value);
      else uniforms[name].value = value;
    }
    uniforms.uView.value = ['rock', 'normals', 'light mask', 'wet mask'].indexOf(config.wall.view);
  }
  return { mesh, configure, snapshot: () => ({ segments, size: uniforms.uWallSize.value.toArray(), quality: config.wall.quality, displacement: config.wall.displacement, sheen: config.wet.sheen, view: config.wall.view }),
    dispose() { mesh.geometry.dispose(); material.dispose(); } };
}
