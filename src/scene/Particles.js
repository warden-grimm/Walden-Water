import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial } from 'three';
import { POOL_HEIGHT } from './ballistics.js';
import { createSplashEmitter } from '../interaction/SplashEmitter.js';
import common from '../shaders/particles-common.glsl?raw';
import lightSource from '../shaders/light.glsl?raw';
import fragmentShader from '../shaders/particle.frag.glsl?raw';
import sprayVertex from '../shaders/spray.vert.glsl?raw';
import burstVertex from '../shaders/burst.vert.glsl?raw';
import motesVertex from '../shaders/motes.vert.glsl?raw';

// Deterministic per-point seeds (mulberry32): the same layout every load, so
// captures are comparable. Generated only when a count changes.
function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pointGeometry(count, seed, extra) {
  const geometry = new BufferGeometry(), next = random(seed);
  // Positions are computed in the vertex shader; this only sets the draw count.
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = next();
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 4));
  for (const [name, fill] of Object.entries(extra)) {
    const values = new Float32Array(count);
    for (let i = 0; i < count; i++) values[i] = fill(i, next);
    geometry.setAttribute(name, new BufferAttribute(values, 1));
  }
  return geometry;
}
const layouts = {
  spray: { key: c => `${c.spray.count}:${c.spray.lipShare}`,
    build: c => pointGeometry(c.spray.count, 0x5eed01, { aKind: i => (i < Math.round(c.spray.count * c.spray.lipShare) ? 0 : 1) }) },
  bursts: { key: (c, slots) => `${slots}:${c.bursts.perBurst}`,
    build: (c, slots) => pointGeometry(slots * c.bursts.perBurst, 0x5eed02, {
      aSlot: i => Math.floor(i / c.bursts.perBurst), aShare: i => (i % c.bursts.perBurst) / c.bursts.perBurst }) },
  motes: { key: c => `${c.dust.capacity}:${c.dust.mistCount}`,
    build: c => pointGeometry(c.dust.capacity + c.dust.mistCount, 0x5eed03, {
      aVary: (i, next) => next(), aKind: i => (i < c.dust.capacity ? 0 : 1) }) },
};

export function createParticles(config, time, light, pointers, renderer) {
  const emitter = createSplashEmitter(config, pointers);
  const shared = { ...light.uniforms, uTime: time, uPoolHeight: { value: POOL_HEIGHT },
    uPointScale: { value: 1 }, uMaxPointSize: { value: 64 } };
  const sharedBindings = { uGravity: ['droplets', 'gravity'], uMinPixels: ['droplets', 'minPixels'],
    uDropletColor: ['droplets', 'color'], uDropletAmbient: ['droplets', 'ambient'], uSparkle: ['droplets', 'sparkle'],
    uTwinkle: ['droplets', 'twinkle'], uTwinkleRate: ['droplets', 'twinkleRate'], uFadeShare: ['droplets', 'fade'] };
  const systems = {
    spray: { vertex: sprayVertex, group: 'spray', bindings: { uWidth: ['curtain', 'width'], uHeight: ['curtain', 'height'],
      uLipLife: ['spray', 'lipLife'], uLipForward: ['spray', 'lipForward'], uLipSide: ['spray', 'lipSide'], uLipDrop: ['spray', 'lipDrop'],
      uBaseSpeed: ['spray', 'baseSpeed'], uBaseForward: ['spray', 'baseForward'], uBaseSide: ['spray', 'baseSide'],
      uBaseSpread: ['spray', 'baseSpread'], uBaseRest: ['spray', 'baseRest'], uJitter: ['spray', 'jitter'],
      uSize: ['spray', 'size'], uOpacity: ['spray', 'opacity'], uSoftness: ['droplets', 'softness'] } },
    bursts: { vertex: burstVertex, group: 'bursts', extra: { uBursts: emitter.uniform, uBurstSlots: { value: emitter.slots } },
      bindings: { uMinShare: ['bursts', 'minShare'], uSpread: ['bursts', 'spread'], uJitter: ['bursts', 'jitter'],
        uLifetime: ['bursts', 'lifetime'], uSize: ['bursts', 'size'], uOpacity: ['bursts', 'opacity'], uSoftness: ['droplets', 'softness'] } },
    motes: { vertex: motesVertex, group: 'dust', bindings: { uWallDepth: ['wall', 'depth'], uWallFade: ['dust', 'wallFade'],
      uEdgeFade: ['dust', 'edgeFade'], uSpread: ['dust', 'spread'], uSwirl: ['dust', 'swirl'], uWobble: ['dust', 'wobble'],
      uWobbleRate: ['dust', 'wobbleRate'], uDensity: ['dust', 'density'], uDustSize: ['dust', 'size'],
      uDustBrightness: ['dust', 'brightness'], uDustSoftness: ['dust', 'softness'], uDustTwinkleRate: ['dust', 'twinkleRate'],
      uDrift: ['dust', 'drift'], uAlongStart: ['dust', 'alongStart'], uAlongEnd: ['dust', 'alongEnd'],
      uMistSize: ['dust', 'mistSize'], uMistOpacity: ['dust', 'mistOpacity'], uMistSoftness: ['dust', 'mistSoftness'],
      uMistDrift: ['dust', 'mistDrift'], uMistAlongStart: ['dust', 'mistAlongStart'], uMistAlongEnd: ['dust', 'mistAlongEnd'],
      uMistColor: ['dust', 'mistColor'] } },
  };
  function bind(uniforms, bindings) {
    for (const [name, [group, key]] of Object.entries(bindings)) {
      const value = config[group][key];
      if (typeof value === 'string') (uniforms[name] ??= { value: new Color() }).value.set(value);
      else (uniforms[name] ??= { value }).value = value;
    }
  }
  bind(shared, sharedBindings);
  const group = [];
  let order = 3;
  for (const [name, system] of Object.entries(systems)) {
    const uniforms = { ...shared, ...system.extra };
    bind(uniforms, system.bindings);
    system.material = new ShaderMaterial({ uniforms, fragmentShader,
      vertexShader: system.vertex.replace('// __LIGHT__', lightSource).replace('// __PARTICLES__', common),
      transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending, premultipliedAlpha: true });
    system.key = layouts[name].key(config, emitter.slots);
    system.points = new Points(layouts[name].build(config, emitter.slots), system.material);
    // Analytic positions cannot be bounded by the placeholder attribute.
    system.points.frustumCulled = false;
    system.points.renderOrder = order++;
    system.points.name = name;
    group.push(system.points);
  }
  function readPointLimit() {
    const gl = renderer.getContext();
    shared.uMaxPointSize.value = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
  }
  readPointLimit();
  function configure(bufferHeight, camera) {
    emitter.configure();
    bind(shared, sharedBindings);
    // Pixels per metre at unit view depth, for perspective sprite sizing.
    shared.uPointScale.value = bufferHeight / (2 * Math.tan(camera.fov * Math.PI / 360));
    systems.bursts.material.uniforms.uBurstSlots.value = emitter.slots;
    for (const [name, system] of Object.entries(systems)) {
      bind(system.material.uniforms, system.bindings);
      const key = layouts[name].key(config, emitter.slots);
      if (key !== system.key) {
        const previous = system.points.geometry;
        system.points.geometry = layouts[name].build(config, emitter.slots);
        previous.dispose(); system.key = key;
      }
      system.points.visible = config[system.group].enabled && system.points.geometry.attributes.position.count > 0;
    }
  }
  return { objects: group, emitter,
    configure,
    update() { emitter.update(time.value); },
    contextRestored() { emitter.contextRestored(); readPointLimit(); },
    snapshot: () => ({ ...Object.fromEntries(Object.entries(systems).map(([name, s]) => [name, { points: s.points.geometry.attributes.position.count, visible: s.points.visible }])),
      bursts: { ...emitter.snapshot(), visible: systems.bursts.points.visible, points: systems.bursts.points.geometry.attributes.position.count },
      maxPointSize: shared.uMaxPointSize.value, pointScale: shared.uPointScale.value }),
    dispose() { emitter.dispose(); for (const system of Object.values(systems)) { system.points.geometry.dispose(); system.material.dispose(); } } };
}
