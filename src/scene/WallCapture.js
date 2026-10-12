import { HalfFloatType, LinearFilter, LinearSRGBColorSpace, UnsignedByteType, WebGLRenderTarget } from 'three';

// The source Scene contains ONLY the wall. None of its materials sample this
// target; the background and curtain consume it only after this pass finishes.
export function createWallCapture(renderer, sourceScene, camera, settings) {
  const texture = { value: null };
  let target = null, width = 0, height = 0, precision = '', generation = 0, loggedFormat;
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
    const nextWidth = Math.max(1, Math.round(bufferWidth * settings.scale));
    const nextHeight = Math.max(1, Math.round(bufferHeight * settings.scale));
    const nextPrecision = settings.precision;
    if (target && width === nextWidth && height === nextHeight && precision === nextPrecision) return;
    const previous = renderer.getRenderTarget(), face = renderer.getActiveCubeFace(), mip = renderer.getActiveMipmapLevel();
    if (target && previous === target) throw new Error('Cannot resize the active wall capture target.');
    const float = nextPrecision !== 'byte' && renderer.extensions.has('EXT_color_buffer_float');
    let candidate;
    // Allocate/check once on resize, never query framebuffer completeness per frame.
    function allocate(type) {
      candidate = new WebGLRenderTarget(nextWidth, nextHeight, { type, colorSpace: LinearSRGBColorSpace,
        minFilter: LinearFilter, magFilter: LinearFilter, generateMipmaps: false,
        depthBuffer: true, stencilBuffer: false });
      renderer.setRenderTarget(candidate);
      const gl = renderer.getContext();
      return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    }
    try {
      let valid = allocate(float ? HalfFloatType : UnsignedByteType);
      if (!valid && float) { candidate.dispose(); valid = allocate(UnsignedByteType); }
      if (!valid) throw new Error('No renderable wall capture format.');
      target?.dispose(); target = candidate; candidate = null;
      width = nextWidth; height = nextHeight; precision = nextPrecision;
      texture.value = target.texture;
      generation++;
      if (loggedFormat !== target.texture.type) {
        loggedFormat = target.texture.type;
        console.info(`[Walden] Wall capture: ${loggedFormat === HalfFloatType ? 'RGBA16F linear' : 'RGBA8 linear (HDR clipped)'}`);
      }
    } finally { renderer.setRenderTarget(previous, face, mip); candidate?.dispose(); }
  }
  return { texture, resize, render,
    // Three recreates context-owned framebuffer objects on next bind. Force the
    // validation/format selection path too; extension support can change.
    contextRestored() { width = 0; },
    snapshot: () => ({ width, height, format: target?.texture.type === HalfFloatType ? 'RGBA16F linear' : 'RGBA8 linear', generation,
      sourceObjects: sourceScene.children.map(object => object.name) }),
    dispose() { target?.dispose(); texture.value = null; } };
}
