import { HalfFloatType, LinearFilter, Mesh, PlaneGeometry, Scene, ShaderMaterial, SRGBColorSpace, Vector2, WebGLRenderTarget } from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import vertexShader from '../shaders/background.vert.glsl?raw';
import compositeSource from '../shaders/composite.frag.glsl?raw';

// M8 post-processing, in display space. Every scene material already applies
// ACES + sRGB itself, and the water, particles and shaft were tuned blending in
// that encoded space (rendering them into a linear target instead visibly
// changed the approved look). So when any effect is on, the scene renders into
// an RGBA16F target that Three treats like the canvas: each material tone maps
// and encodes exactly as on screen, once. Bloom then adds its thresholded glow
// to those display values, and the composite adds the vignette on the
// canvas with no second tone mapping. With every effect off, or no renderable
// float target, the scene renders straight to the canvas exactly as before.
export function createPostProcessing(config, renderer) {
  const uniforms = { uScene: { value: null }, uResolution: { value: new Vector2(1, 1) },
    uVignette: { value: 0 }, uVignetteStart: { value: 0 }, uVignetteEnd: { value: 1 } };
  // Input is already tone mapped and encoded: the composite must not do it again.
  const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader: compositeSource,
    depthTest: false, depthWrite: false, toneMapped: false });
  const geometry = new PlaneGeometry(1, 1);
  const quad = new Mesh(geometry, material);
  quad.frustumCulled = false;
  const output = new Scene();
  output.add(quad);
  let target = null, bloom = null, key = '', available = true, loggedFallback = false;
  const bloomSize = [0, 0];

  const active = () => available && config.post.enabled && (config.post.bloom || config.post.vignette);

  function allocate(width, height) {
    const s = config.post, samples = Math.min(s.samples, renderer.capabilities.maxSamples);
    const next = `${width}x${height}:${samples}`;
    if (target && next === key) return;
    const previous = renderer.getRenderTarget(), face = renderer.getActiveCubeFace(), mip = renderer.getActiveMipmapLevel();
    let candidate = null;
    try {
      // Checked once per allocation. Float storage keeps 8-bit banding out of the dark scene through bloom.
      if (renderer.extensions.has('EXT_color_buffer_float')) {
        candidate = new WebGLRenderTarget(width, height, { type: HalfFloatType, colorSpace: SRGBColorSpace,
          minFilter: LinearFilter, magFilter: LinearFilter, generateMipmaps: false, depthBuffer: true, stencilBuffer: false, samples });
        // Three applies renderer tone mapping and encodes to the target's colour
        // space only for the canvas or a target flagged like this (three.js
        // #27868). Its only other effect is an 8-bit MSAA format choice, which
        // does not apply to a half-float target.
        candidate.isXRRenderTarget = true;
        renderer.setRenderTarget(candidate);
        const gl = renderer.getContext();
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { candidate.dispose(); candidate = null; }
      }
      available = candidate !== null;
      if (!available) {
        if (!loggedFallback) console.info('[Walden] Post-processing unavailable (no renderable RGBA16F); rendering directly.');
        loggedFallback = true;
        return;
      }
      target?.dispose(); target = candidate; candidate = null; key = next;
      uniforms.uScene.value = target.texture;
    } finally { renderer.setRenderTarget(previous, face, mip); candidate?.dispose(); }
  }

  function configure(bufferWidth, bufferHeight) {
    const s = config.post;
    uniforms.uResolution.value.set(bufferWidth, bufferHeight);
    uniforms.uVignette.value = s.vignette ? s.vignetteStrength : 0;
    uniforms.uVignetteStart.value = s.vignetteStart;
    uniforms.uVignetteEnd.value = Math.max(s.vignetteEnd, s.vignetteStart + 1e-3);
    if (!config.post.enabled || !(s.bloom || s.vignette)) return;
    allocate(bufferWidth, bufferHeight);
    if (!available) return;
    const bloomWidth = Math.max(2, Math.round(bufferWidth * s.bloomResolution));
    const bloomHeight = Math.max(2, Math.round(bufferHeight * s.bloomResolution));
    // UnrealBloomPass starts its mip chain at half the size it is given; pass
    // double so its first level is bloomResolution x the buffer.
    bloom ??= new UnrealBloomPass(new Vector2(2 * bloomWidth, 2 * bloomHeight), s.bloomStrength, s.bloomRadius, s.bloomThreshold);
    bloom.setSize(2 * bloomWidth, 2 * bloomHeight);
    bloomSize[0] = bloomWidth; bloomSize[1] = bloomHeight;
    bloom.strength = s.bloomStrength; bloom.radius = s.bloomRadius; bloom.threshold = s.bloomThreshold;
  }

  function render(scene, camera) {
    if (!active() || !target) { renderer.render(scene, camera); return; }
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    // Bloom reads the target and adds its glow back into it (never sampling the texture it writes).
    if (config.post.bloom) bloom.render(renderer, null, target, 0, false);
    renderer.setRenderTarget(null);
    renderer.render(output, camera);
  }

  return { configure, render,
    // The lost context destroyed these GPU objects; build fresh ones on the next configure.
    contextRestored() { target = null; bloom = null; key = ''; uniforms.uScene.value = null; available = true; },
    snapshot: () => ({ active: active(), target: target && active() ? { width: target.width, height: target.height, samples: target.samples } : null,
      bloom: active() && config.post.bloom, vignette: active() && config.post.vignette,
      bloomSize: bloom ? [...bloomSize] : null }),
    dispose() { target?.dispose(); bloom?.dispose(); geometry.dispose(); material.dispose(); output.clear(); } };
}
