import { AdditiveBlending, Color, HalfFloatType, LinearFilter, Mesh, NoColorSpace, PlaneGeometry, Points, Scene, ShaderMaterial,
  UnsignedByteType, Vector2, Vector4, WebGLRenderTarget } from 'three';
import { choices } from '../config.js';
import { POOL_HEIGHT } from './ballistics.js';
import { poolExtent, rippleDomain } from './poolLayout.js';
import { pointGeometry } from './Particles.js';
import { assemble } from './shaderChunks.js';
import poolVertex from '../shaders/pool.vert.glsl?raw';
import poolFragment from '../shaders/pool.frag.glsl?raw';
import waterCommon from '../shaders/water-common.glsl?raw';
import noise from '../shaders/noise.glsl?raw';
import rippleFragment from '../shaders/ripple.frag.glsl?raw';
import impactVertex from '../shaders/ring-impact.vert.glsl?raw';
import sprayRingVertex from '../shaders/ring-spray.vert.glsl?raw';
import burstRingVertex from '../shaders/ring-burst.vert.glsl?raw';

// Pool surface (M7). Each frame the ripple target is cleared and every live
// ring is splatted into it as a point sprite: continuous impacts along the
// curtain base, plus one ring per spray/burst droplet evaluated from that
// droplet's own seeds and launch (no readback, no CPU particle state). The
// pool then samples the completed target, wall capture and wall depth.
export function createPool(config, time, light, camera, capture, curtain, particles, renderer) {
  const rippleTexture = { value: null };
  const ring = { uRippleDomain: { value: new Vector4() }, uRipplePixelsPerMetre: { value: 1 },
    uRingSpeed: { value: 0 }, uRingWavelength: { value: 0 }, uRingLife: { value: 0 }, uRingFoam: { value: 0 } };
  const ringBindings = { uRingSpeed: 'ringSpeed', uRingWavelength: 'ringWavelength', uRingLife: 'ringLife', uRingFoam: 'ringFoam' };
  const { spray, bursts } = particles.systems;
  const sources = {
    impact: { vertex: impactVertex, uniforms: { ...particles.shared, ...ring, uWidth: { value: 0 }, uImpactPeriod: { value: 0 },
      uImpactDepth: { value: 0 }, uImpactStrength: { value: 0 } } },
    spray: { vertex: sprayRingVertex, uniforms: { ...spray.material.uniforms, ...ring, uSprayRing: { value: 0 } } },
    bursts: { vertex: burstRingVertex, uniforms: { ...bursts.material.uniforms, ...ring, uBurstRing: { value: 0 } } },
  };
  const rippleScene = new Scene();
  rippleScene.background = new Color(0, 0, 0);
  let impactCount = config.pool.impactRings;
  for (const [name, source] of Object.entries(sources)) {
    source.material = new ShaderMaterial({ uniforms: source.uniforms, vertexShader: assemble(source.vertex), fragmentShader: rippleFragment,
      transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending, premultipliedAlpha: true });
    const geometry = name === 'impact' ? pointGeometry(impactCount, 0x5eed05, {}) : particles.systems[name].points.geometry;
    source.points = new Points(geometry, source.material);
    source.points.frustumCulled = false;
    source.points.name = `${name} rings`;
    rippleScene.add(source.points);
  }

  const uniforms = { ...curtain.uniforms, ...light.uniforms, uTime: time, uSceneDepth: capture.depth, uRippleTexture: rippleTexture,
    uProjection: { value: camera.projectionMatrix }, uProjectionInverse: { value: camera.projectionMatrixInverse },
    uCameraWorld: { value: camera.matrixWorld }, uRippleDomain: ring.uRippleDomain, uRippleTexel: { value: new Vector2() },
    uPoolHeight: { value: POOL_HEIGHT }, uPoolFallback: { value: new Color() }, uRockDepth: { value: 0 }, uView: { value: 0 } };
  const bindings = { uPoolColor: ['pool', 'color'], uPoolFoamColor: ['pool', 'foamColor'], uFresnelBase: ['pool', 'fresnelBase'],
    uReflectivity: ['pool', 'reflectivity'], uPoolGloss: ['pool', 'gloss'], uShoreSoftness: ['pool', 'shoreSoftness'],
    uRippleScale: ['pool', 'rippleScale'], uRippleSpeed: ['pool', 'rippleSpeed'], uRippleSlope: ['pool', 'rippleSlope'],
    uChurn: ['pool', 'churn'], uChurnWidth: ['pool', 'churnWidth'], uChurnScale: ['pool', 'churnScale'], uChurnSpeed: ['pool', 'churnSpeed'],
    uPoolFoam: ['pool', 'foam'], uFoamThreshold: ['pool', 'foamThreshold'], uCurtainReflection: ['pool', 'curtainReflection'],
    uRingHeight: ['pool', 'ringHeight'], uReflectionSteps: ['pool', 'reflectionSteps'], uWallPlane: ['wall', 'depth'], uBounceColor: ['light', 'bounceColor'], uBounce: ['light', 'bounce'],
    uCurtainWidth: ['curtain', 'width'], uCurtainHeight: ['curtain', 'height'], uCurtainBow: ['curtain', 'bow'],
    uCurtainEdgeUv: ['water', 'edgeWidth'], uBehindCurtain: ['droplets', 'behindCurtain'] };
  function bind() {
    for (const [name, [group, key]] of Object.entries(bindings)) {
      const value = config[group][key];
      if (typeof value === 'string') (uniforms[name] ??= { value: new Color() }).value.set(value);
      else (uniforms[name] ??= { value }).value = value;
    }
  }
  bind();
  const material = new ShaderMaterial({ uniforms, vertexShader: poolVertex,
    fragmentShader: assemble(poolFragment).replace('// __WATER__', waterCommon.replace('// __NOISE__', noise)),
    transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true });
  const geometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mesh = new Mesh(geometry, material);
  mesh.name = 'pool';
  mesh.frustumCulled = false;
  // After the background (-1), before the shaft segment behind the curtain (0) and the water (1).
  mesh.renderOrder = -0.5;

  let target = null, targetKey = '', loggedFormat;
  function allocate(domain) {
    const key = `${domain.pixelsWide}x${domain.pixelsDeep}:${config.pool.precision}`;
    if (target && key === targetKey) return;
    const previous = renderer.getRenderTarget(), face = renderer.getActiveCubeFace(), mip = renderer.getActiveMipmapLevel();
    let candidate;
    function attempt(type) {
      candidate = new WebGLRenderTarget(domain.pixelsWide, domain.pixelsDeep, { type, colorSpace: NoColorSpace,
        minFilter: LinearFilter, magFilter: LinearFilter, generateMipmaps: false, depthBuffer: false, stencilBuffer: false });
      renderer.setRenderTarget(candidate);
      const gl = renderer.getContext();
      return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    }
    // Checked once per allocation, never per frame. Both formats use the same
    // non-negative R/G split encoding; byte storage only quantizes and clips at 1.
    try {
      const float = config.pool.precision !== 'byte' && renderer.extensions.has('EXT_color_buffer_float');
      let valid = float && attempt(HalfFloatType);
      if (!valid) { candidate?.dispose(); valid = attempt(UnsignedByteType); }
      if (!valid) throw new Error('No renderable pool ripple format.');
      target?.dispose(); target = candidate; candidate = null; targetKey = key;
      rippleTexture.value = target.texture;
      if (loggedFormat !== target.texture.type) {
        loggedFormat = target.texture.type;
        console.info(`[Walden] Pool ripples: ${loggedFormat === HalfFloatType ? 'RGBA16F' : 'RGBA8 (quantized, clipped at 1)'} ${domain.pixelsWide}x${domain.pixelsDeep}`);
      }
    } finally { renderer.setRenderTarget(previous, face, mip); candidate?.dispose(); }
  }

  function configure(aspect) {
    const s = config.pool;
    bind();
    uniforms.uPoolFallback.value.set(config.renderer.background);
    uniforms.uRockDepth.value = config.rock.relief + config.rock.ledgeDepth;
    uniforms.uView.value = choices.pool.view.indexOf(s.view);
    const extent = poolExtent(aspect, config, camera.position.z);
    mesh.scale.set(extent.width, 1, extent.front - extent.back);
    mesh.position.set(0, POOL_HEIGHT, (extent.front + extent.back) / 2);
    mesh.visible = s.enabled;
    const domain = rippleDomain(s);
    ring.uRippleDomain.value.set(domain.x, domain.z, domain.width, domain.depth);
    ring.uRipplePixelsPerMetre.value = domain.pixelsWide / domain.width;
    uniforms.uRippleTexel.value.set(1 / domain.pixelsWide, 1 / domain.pixelsDeep);
    for (const [name, key] of Object.entries(ringBindings)) ring[name].value = s[key];
    const impact = sources.impact.uniforms;
    impact.uWidth.value = config.curtain.width; impact.uImpactPeriod.value = s.impactPeriod;
    impact.uImpactDepth.value = s.impactDepth; impact.uImpactStrength.value = s.impactStrength;
    sources.spray.uniforms.uSprayRing.value = s.sprayRing;
    sources.bursts.uniforms.uBurstRing.value = s.burstRing;
    if (impactCount !== s.impactRings) {
      const previous = sources.impact.points.geometry;
      sources.impact.points.geometry = pointGeometry(s.impactRings, 0x5eed05, {});
      previous.dispose(); impactCount = s.impactRings;
    }
    if (s.enabled) allocate(domain);
  }

  function update() {
    if (!config.pool.enabled || !target) return;
    // Follow the droplet systems' current geometry (rebuilt when their counts change).
    for (const name of ['spray', 'bursts']) {
      const droplets = particles.systems[name].points;
      sources[name].points.geometry = droplets.geometry;
      sources[name].points.visible = droplets.visible;
    }
    sources.impact.points.visible = impactCount > 0;
    const previous = renderer.getRenderTarget(), face = renderer.getActiveCubeFace(), mip = renderer.getActiveMipmapLevel();
    const autoClear = renderer.autoClear;
    try {
      renderer.setRenderTarget(target);
      renderer.autoClear = true;
      renderer.render(rippleScene, camera);
    } finally {
      renderer.autoClear = autoClear;
      renderer.setRenderTarget(previous, face, mip);
    }
  }

  return { objects: [mesh], uniforms, configure, update,
    // The lost context destroyed the target; allocate a fresh one on the next configure.
    contextRestored() { target = null; targetKey = ''; rippleTexture.value = null; },
    snapshot: () => ({ enabled: config.pool.enabled, view: config.pool.view,
      target: target ? { width: target.width, height: target.height, format: target.texture.type === HalfFloatType ? 'RGBA16F' : 'RGBA8' } : null,
      domain: ring.uRippleDomain.value.toArray(), rings: { impact: impactCount,
        spray: sources.spray.points.geometry.attributes.position.count, bursts: sources.bursts.points.geometry.attributes.position.count } }),
    dispose() {
      target?.dispose(); rippleTexture.value = null;
      geometry.dispose(); material.dispose();
      sources.impact.points.geometry.dispose();
      for (const source of Object.values(sources)) source.material.dispose();
      rippleScene.clear();
    } };
}
