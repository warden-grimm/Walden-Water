import './styles.css';
import { ACESFilmicToneMapping, SRGBColorSpace, WebGLRenderer } from 'three';
import { config, defaults } from './config.js';
import { loadSavedSettings, resetSettings, saveSettings } from './settings.js';
import { createScene } from './scene/createScene.js';
import { createTimeline } from './time.js';
import { createPointerTracker } from './interaction/PointerTracker.js';
import { createAdaptiveResolution } from './adaptiveResolution.js';

const canvas = document.querySelector('#scene');
const notice = document.querySelector('#scene-error');
const noticeText = document.querySelector('#scene-error-text');
const restart = document.querySelector('#restart');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const savedSettings = loadSavedSettings(config);
const timeline = createTimeline(config.timing);
const adaptive = createAdaptiveResolution(config.adaptive);
let renderer, world, observer, debug, pointers;
let disposed = false;
let contextLost = false;
let running = false;
let frames = 0;
let restores = 0;
let width = 1, height = 1;
let dprQuery;

function showNotice(message) {
  noticeText.textContent = message;
  notice.hidden = false;
}

function pixelRatio() { return Math.min(window.devicePixelRatio, config.renderer.maxDpr, 2, adaptive.scale); }

function resize() {
  if (disposed || contextLost) return;
  debug?.cancel('Settings or viewport changed; restart the sample.');
  width = Math.max(1, canvas.clientWidth);
  height = Math.max(1, canvas.clientHeight);
  // Adaptive resolution lowers the cap under sustained overload; every buffer follows this one ratio.
  renderer.setPixelRatio(pixelRatio());
  adaptive.reset();
  renderer.setSize(width, height, false);
  renderer.toneMappingExposure = config.renderer.exposure;
  world.configure(width / height, motionPreference.matches, canvas.width, canvas.height);
  pointers.resize();
}

function watchDpr() {
  dprQuery?.removeEventListener('change', onDprChange);
  dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  dprQuery.addEventListener('change', onDprChange);
}
function onDprChange() { resize(); watchDpr(); }

function render(timestamp) {
  const rawDelta = timeline.tick(timestamp);
  world.updateCamera(motionPreference.matches);
  pointers.update(world.camera, timestamp);
  renderer.info.reset();
  debug?.begin(timestamp);
  world.render(Math.min(rawDelta, config.timing.maxDelta));
  debug?.end();
  frames++;
  debug?.record(timestamp, rawDelta);
  // Debug-only synthetic GPU-like cost (ms per megapixel of buffer) to exercise adaptive resolution.
  if (debug && config.adaptive.simulateLoad > 0) {
    const until = performance.now() + config.adaptive.simulateLoad * canvas.width * canvas.height / 1e6;
    while (performance.now() < until) { /* busy wait */ }
  }
  // Resize only when the level change actually changes the ratio (not on DPR-1 devices).
  if (adaptive.record(rawDelta, timestamp / 1000) && pixelRatio() !== renderer.getPixelRatio()) resize();
}

function syncLoop() {
  timeline.pause();
  adaptive.reset(); // a pause or resume is not overload evidence
  running = !disposed && !contextLost && !document.hidden;
  if (!running) { pointers?.clear(); debug?.cancel('Rendering paused; restart the sample.'); }
  renderer.setAnimationLoop(running ? render : null);
}

function onMotionChange() {
  debug?.cancel('Motion preference changed; restart the sample.');
  world.updateCamera(motionPreference.matches);
}
function onContextLost(event) {
  event.preventDefault();
  contextLost = true;
  debug?.contextLost();
  syncLoop();
  showNotice('The graphics connection was interrupted. Reconnecting… You can also reload the scene.');
}
function onContextRestored() {
  contextLost = false;
  restores++;
  debug?.contextRestored();
  world.contextRestored();
  // Three.js restores its internal renderer first; scene resources upload lazily.
  resize();
  notice.hidden = true;
  syncLoop();
}
function preventGesture(event) { event.preventDefault(); }
function reload() { window.location.reload(); }

function snapshot() {
  return {
    viewport: { width, height }, buffer: { width: canvas.width, height: canvas.height },
    dpr: renderer.getPixelRatio(), adaptive: adaptive.snapshot(), running, contextLost, restores, frames, savedSettings,
    elapsed: timeline.uniform.value, reducedMotion: motionPreference.matches,
    camera: world.camera.position.toArray(),
    drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
    programs: renderer.info.programs.length,
    wall: world.wall.snapshot(),
    curtain: world.curtain.snapshot(), capture: world.capture.snapshot(),
    touch: { ...world.field.snapshot(), ...pointers.snapshot() },
    particles: world.particles.snapshot(), shaft: world.shaft.snapshot(), pool: world.pool.snapshot(), post: world.post.snapshot(),
    effects: 'M8: touch field, water parting/foam, spray, touch bursts, shaft dust/mist, volumetric shaft, pool ripples/impact rings, low mist, bloom/vignette post, adaptive DPR',
    userAgent: navigator.userAgent,
  };
}

function dispose() {
  restart.onclick = null;
  if (disposed) return;
  disposed = true;
  renderer?.setAnimationLoop(null);
  running = false;
  observer?.disconnect();
  dprQuery?.removeEventListener('change', onDprChange);
  window.removeEventListener('resize', resize);
  document.removeEventListener('visibilitychange', syncLoop);
  motionPreference.removeEventListener('change', onMotionChange);
  canvas.removeEventListener('webglcontextlost', onContextLost);
  canvas.removeEventListener('webglcontextrestored', onContextRestored);
  for (const type of ['wheel', 'gesturestart', 'gesturechange']) canvas.removeEventListener(type, preventGesture);
  restart.removeEventListener('click', reload);
  debug?.dispose();
  pointers?.dispose();
  world?.dispose();
  // Leave GL state at defaults: an HMR successor reuses this context and Three
  // assumes a fresh one (blending off). Leaked additive blending broke field validation.
  renderer?.resetState();
  renderer?.dispose();
}

try {
  notice.hidden = true;
  renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.resetState(); // The canvas context may be inherited from a disposed HMR instance.
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.info.autoReset = false; // Count the wall capture and final composite together.
  pointers = createPointerTracker(canvas, config);
  world = createScene(config, timeline.uniform, renderer, pointers);
  observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', syncLoop);
  motionPreference.addEventListener('change', onMotionChange);
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);
  for (const type of ['wheel', 'gesturestart', 'gesturechange']) canvas.addEventListener(type, preventGesture, { passive: false });
  restart.addEventListener('click', reload);
  watchDpr();
  resize();
  syncLoop();
  if (new URLSearchParams(location.search).has('debug')) {
    import('./debug/panel.js').then(({ createDebugPanel }) => {
      if (disposed) return; // A fast HMR must not leave an orphan asynchronous GUI.
      debug = createDebugPanel({ config, resize, snapshot, renderer, resetTouch: world.field.reset, inspectTouch: world.field.inspect,
        settings: { save: () => saveSettings(config, defaults), reset: () => resetSettings(config, defaults) } });
    }).catch(error => console.error('Debug panel could not load.', error));
  }
} catch (error) {
  dispose();
  restart.onclick = reload;
  showNotice('The 3D view could not start. Enable WebGL 2 and hardware acceleration, then reload.');
  console.error('Unable to initialize the scene.', error);
}

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    // After a context restore, Three's dispose listeners for objects created
    // before the loss point at GL objects of the lost context; disposing them
    // logs "object does not belong to this context" warnings. Reload the page
    // instead of hot-swapping (development only; a reload leaks nothing).
    if (restores > 0) { renderer?.setAnimationLoop(null); disposed = true; window.location.reload(); return; }
    dispose();
  });
}
