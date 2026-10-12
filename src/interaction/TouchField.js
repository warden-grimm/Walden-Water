import { HalfFloatType, Mesh, NearestFilter, NoBlending, NoColorSpace, OrthographicCamera,
  PlaneGeometry, Scene, ShaderMaterial, UnsignedByteType, Vector2, WebGLRenderTarget } from 'three';
import common from '../shaders/field-common.glsl?raw';
import vertex from '../shaders/field.vert.glsl?raw';
import fragment from '../shaders/field.frag.glsl?raw';

export function createTouchField(renderer, config, pointers) {
  const settings = config.touch;
  const uniforms = { uFieldTexture: { value: null }, uFieldSize: { value: new Vector2() }, uFieldByte: { value: false },
    uMode: { value: 0 }, uProbeUv: { value: new Vector2() }, uPointerCount: pointers.count,
    uSegments: { value: pointers.segments }, uStrengths: { value: pointers.strengths },
    uWorldSize: { value: new Vector2() }, uDelta: { value: 0 },
    uRadius: { value: 0 }, uRecovery: { value: 0 }, uDiffusion: { value: 0 }, uNeutralThreshold: { value: 0 },
    uLipSpeed: { value: 0 }, uGravity: { value: 0 }, uFlowSpeed: { value: 0 }, uTransport: { value: 0 } };
  const material = new ShaderMaterial({ uniforms, vertexShader: vertex.replace('// __FIELD__', common),
    fragmentShader: fragment.replace('// __FIELD__', common), depthTest: false, depthWrite: false,
    blending: NoBlending, toneMapped: false });
  const geometry = new PlaneGeometry(1, 1), mesh = new Mesh(geometry, material), scene = new Scene(), camera = new OrthographicCamera();
  mesh.frustumCulled = false; scene.add(mesh);
  // Stable objects consumed by curtain/overlay. Only .value changes at a swap.
  const shared = { uFieldTexture: { value: null }, uFieldSize: uniforms.uFieldSize, uFieldByte: uniforms.uFieldByte };
  let read, write, key = '', generation = 0, steps = 0, dirty = false, format, validation, enabled = settings.enabled;
  const probeBytes = new Uint8Array(4);
  function draw(target) {
    if (uniforms.uFieldTexture.value === target.texture) throw new Error('Touch field feedback loop rejected.');
    renderer.setRenderTarget(target); renderer.render(scene, camera);
  }
  function createTarget(width, height, type) {
    return new WebGLRenderTarget(width, height, { type, colorSpace: NoColorSpace, minFilter: NearestFilter,
      magFilter: NearestFilter, generateMipmaps: false, depthBuffer: false, stencilBuffer: false, samples: 0 });
  }
  function neutralize(a, b) {
    uniforms.uFieldTexture.value = null; uniforms.uMode.value = 3;
    draw(a); draw(b); uniforms.uMode.value = 0;
  }
  function allocate(type) {
    const a = createTarget(settings.width, settings.height, type), b = createTarget(settings.width, settings.height, type);
    const probe = createTarget(1, 1, UnsignedByteType);
    let valid = false;
    try {
      const gl = renderer.getContext();
      uniforms.uFieldByte.value = type === UnsignedByteType;
      uniforms.uFieldSize.value.set(settings.width, settings.height);
      for (const target of [a, b, probe]) {
        renderer.setRenderTarget(target);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return null;
      }
      // Exercise actual render, byte encode, nearest fetch, manual interpolation
      // and VERTEX texture sampling. These synchronous reads run only on allocation.
      uniforms.uFieldTexture.value = null; uniforms.uMode.value = 1; draw(a);
      uniforms.uFieldTexture.value = a.texture; uniforms.uMode.value = 2;
      for (const [u, v, x, energy] of [[0.25, 0.25, -0.75, 0.25], [0.5, 0.5, 0, 0.5], [0.75, 0.75, 0.75, 0.75]]) {
        uniforms.uProbeUv.value.set(u, v); draw(probe);
        renderer.readRenderTargetPixels(probe, 0, 0, 1, 1, probeBytes);
        if (Math.abs(probeBytes[0] / 255 - (x * 0.5 + 0.5)) > 2 / 255 || Math.abs(probeBytes[1] / 255 - energy) > 2 / 255) return null;
      }
      neutralize(a, b);
      uniforms.uFieldTexture.value = a.texture; uniforms.uMode.value = 2;
      uniforms.uProbeUv.value.set(0.5, 0.5); draw(probe);
      renderer.readRenderTargetPixels(probe, 0, 0, 1, 1, probeBytes);
      if (Math.abs(probeBytes[0] - 128) > 1 || probeBytes[1] !== 0) return null;
      uniforms.uMode.value = 0; valid = true;
      return [a, b];
    } finally { probe.dispose(); if (!valid) { a.dispose(); b.dispose(); } }
  }
  function configure() {
    if (enabled !== settings.enabled) { enabled = settings.enabled; dirty = true; pointers.clear(); }
    uniforms.uWorldSize.value.set(config.curtain.width, config.curtain.height);
    uniforms.uRadius.value = settings.radius; uniforms.uRecovery.value = settings.recovery;
    uniforms.uDiffusion.value = settings.diffusion; uniforms.uNeutralThreshold.value = settings.neutralThreshold;
    uniforms.uLipSpeed.value = config.water.lipSpeed; uniforms.uGravity.value = config.water.gravity;
    uniforms.uFlowSpeed.value = config.water.flowSpeed; uniforms.uTransport.value = settings.transport;
    const nextKey = `${settings.width}:${settings.height}:${settings.precision}`;
    if (read && nextKey === key) return;
    const previous = renderer.getRenderTarget(), face = renderer.getActiveCubeFace(), mip = renderer.getActiveMipmapLevel(), autoClear = renderer.autoClear;
    if (previous && (previous === read || previous === write)) throw new Error('Cannot rebuild an active field target.');
    let pair;
    try {
      renderer.autoClear = false;
      if (settings.precision !== 'byte' && renderer.extensions.has('EXT_color_buffer_float')) pair = allocate(HalfFloatType);
      if (!pair) pair = allocate(UnsignedByteType);
      if (!pair) throw new Error('No usable touch field framebuffer/sampling path.');
      read?.dispose(); write?.dispose();
      [read, write] = pair; key = nextKey; generation++; dirty = false;
      const nextFormat = read.texture.type === HalfFloatType ? 'RGBA16F / manual bilinear' : 'RGBA8 packed16 / manual bilinear';
      if (format !== nextFormat) { format = nextFormat; console.info(`[Walden] Touch field: ${format}; framebuffer, vertex sampling and neutral checks passed`); }
      validation = 'render + signed/pressure interpolation + vertex sampling + neutral passed';
    } finally {
      if (read) {
        shared.uFieldTexture.value = uniforms.uFieldTexture.value = read.texture;
        uniforms.uFieldByte.value = read.texture.type === UnsignedByteType;
        uniforms.uFieldSize.value.set(read.width, read.height);
      }
      uniforms.uMode.value = 0;
      renderer.autoClear = autoClear; renderer.setRenderTarget(previous, face, mip);
    }
  }
  function update(delta) {
    if (!read) return;
    if (!settings.enabled && !dirty) return;
    const previous = renderer.getRenderTarget(), face = renderer.getActiveCubeFace(), mip = renderer.getActiveMipmapLevel(), autoClear = renderer.autoClear;
    if (previous === read || previous === write) throw new Error('Touch field cannot update inside its own target.');
    try {
      renderer.autoClear = false;
      if (dirty) { neutralize(read, write); dirty = false; }
      if (!settings.enabled) { shared.uFieldTexture.value = uniforms.uFieldTexture.value = read.texture; return; }
      const substeps = Math.max(1, Math.ceil(delta / settings.maxStep));
      uniforms.uDelta.value = delta / substeps;
      for (let i = 0; i < substeps; i++) {
        uniforms.uFieldTexture.value = read.texture; draw(write);
        const swap = read; read = write; write = swap; steps++;
      }
      shared.uFieldTexture.value = uniforms.uFieldTexture.value = read.texture;
    } finally { renderer.autoClear = autoClear; renderer.setRenderTarget(previous, face, mip); }
  }
  // Explicit debug request only: never called by the animation loop. Encode
  // into a temporary byte target to inspect either native format identically.
  function inspect() {
    const previous = renderer.getRenderTarget(), face = renderer.getActiveCubeFace(), mip = renderer.getActiveMipmapLevel(), autoClear = renderer.autoClear;
    const target = createTarget(read.width, read.height, UnsignedByteType);
    const pixels = new Uint8Array(read.width * read.height * 4);
    try {
      renderer.autoClear = false; uniforms.uFieldTexture.value = read.texture; uniforms.uMode.value = 4;
      draw(target); renderer.readRenderTargetPixels(target, 0, 0, read.width, read.height, pixels);
      let max = 0, sum = 0, weightedU = 0, weightedV = 0, minX = 0, maxX = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const x = (pixels[i] * 256 + pixels[i + 1] - 32768) / 32767;
        const energy = (pixels[i + 2] * 256 + pixels[i + 3]) / 65535;
        const index = i / 4;
        max = Math.max(max, energy); minX = Math.min(minX, x); maxX = Math.max(maxX, x); sum += energy;
        weightedU += energy * ((index % read.width) + 0.5) / read.width;
        weightedV += energy * (Math.floor(index / read.width) + 0.5) / read.height;
      }
      return { max, sum, centroidU: sum ? weightedU / sum : null, centroidV: sum ? weightedV / sum : null, minX, maxX };
    } finally { uniforms.uMode.value = 0; renderer.autoClear = autoClear; renderer.setRenderTarget(previous, face, mip); target.dispose(); }
  }
  return { uniforms: shared, configure, update, reset() { dirty = true; pointers.clear(); },
    inspect,
    contextRestored() { read = write = null; key = ''; shared.uFieldTexture.value = uniforms.uFieldTexture.value = null; },
    snapshot: () => ({ width: read?.width, height: read?.height, format, generation, steps,
      distinctTargets: read !== write, readId: read?.texture.id, writeId: write?.texture.id, validation }),
    dispose() { read?.dispose(); write?.dispose(); geometry.dispose(); material.dispose(); shared.uFieldTexture.value = null; } };
}
