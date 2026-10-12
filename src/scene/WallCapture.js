import { HalfFloatType, LinearFilter, LinearSRGBColorSpace, SRGBColorSpace, UnsignedByteType, WebGLRenderTarget } from 'three';

// The source Scene contains ONLY the wall. None of its materials sample this
// target; the background and curtain consume it only after this pass finishes.
export function createWallCapture(renderer, sourceScene, camera, settings) {
  const texture = { value: null };
  let target = null, width = 0, height = 0, precision = '', samples = 0, generation = 0, loggedFormat;
  function render() {
    const previous = renderer.getRenderTarget();
    if (!target || previous === target) throw new Error('Wall capture needs an allocated target separate from its output destination.');
    const face = renderer.getActiveCubeFace(), mip = renderer.getActiveMipmapLevel();
    const autoClear = renderer.autoClear;
    // setRenderTarget restores each target's viewport/scissor; we never mutate
    // the renderer's global viewport/scissor, clear colour, exposure or camera.
    try {
      renderer.setRenderTarget(target);
      renderer.autoClear = true;
      renderer.render(sourceScene, camera);
    } finally {
      renderer.autoClear = autoClear;
      renderer.setRenderTarget(previous, face, mip);
    }
  }
  function resize(bufferWidth, bufferHeight) {
    const nextWidth = Math.max(1, Math.round(bufferWidth * settings.wallResolution));
    const nextHeight = Math.max(1, Math.round(bufferHeight * settings.wallResolution));
    const nextPrecision = settings.precision;
    const nextSamples = Math.min(settings.samples ?? 0, renderer.capabilities.maxSamples);
    if (target && width === nextWidth && height === nextHeight && precision === nextPrecision && samples === nextSamples) return;
    const previous = renderer.getRenderTarget(), face = renderer.getActiveCubeFace(), mip = renderer.getActiveMipmapLevel();
    if (target && previous === target) throw new Error('Cannot resize the active wall capture target.');
    const float = nextPrecision !== 'byte' && renderer.extensions.has('EXT_color_buffer_float');
    let candidate;
    // Allocate/check once on resize, never query framebuffer completeness per frame.
    function allocate(type) {
      // WebGL2 encodes into SRGB8_ALPHA8 and decodes sampled RGB in hardware.
      // This preserves shadow precision; all shader calculations remain linear.
      candidate = new WebGLRenderTarget(nextWidth, nextHeight, { type, colorSpace: type === HalfFloatType ? LinearSRGBColorSpace : SRGBColorSpace,
        minFilter: LinearFilter, magFilter: LinearFilter, generateMipmaps: false,
        depthBuffer: true, stencilBuffer: false, samples: nextSamples });
      renderer.setRenderTarget(candidate);
      const gl = renderer.getContext();
      return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    }
    try {
      let valid = allocate(float ? HalfFloatType : UnsignedByteType);
      if (!valid && float) { candidate.dispose(); valid = allocate(UnsignedByteType); }
      if (!valid) throw new Error('No renderable wall capture format.');
      target?.dispose(); target = candidate; candidate = null;
      width = nextWidth; height = nextHeight; precision = nextPrecision; samples = nextSamples;
      texture.value = target.texture;
      generation++;
      if (loggedFormat !== target.texture.type) {
        loggedFormat = target.texture.type;
        console.info(`[Walden] Wall capture: ${loggedFormat === HalfFloatType ? 'RGBA16F linear' : 'SRGB8_ALPHA8 (hardware decode; HDR clipped)'}`);
      }
    } finally { renderer.setRenderTarget(previous, face, mip); candidate?.dispose(); }
  }
  return { texture, resize, render,
    // The lost context already destroyed its GPU objects. Abandon its target
    // instead of invoking stale Three disposal callbacks in the new context.
    contextRestored() { target = null; texture.value = null; width = 0; },
    snapshot: () => ({ width, height, samples, format: target?.texture.type === HalfFloatType ? 'RGBA16F linear' : 'SRGB8_ALPHA8', generation,
      sourceObjects: sourceScene.children.map(object => object.name) }),
    dispose() { target?.dispose(); texture.value = null; } };
}
