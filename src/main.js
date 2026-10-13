import './styles.css';
import { ACESFilmicToneMapping, SRGBColorSpace, WebGLRenderer } from 'three';
import { config } from './config.js';
import { createScene } from './scene/createScene.js';
import { createTimeline } from './time.js';
import { createPointerTracker } from './interaction/PointerTracker.js';

const canvas = document.querySelector('#scene');
const notice = document.querySelector('#scene-error');
const noticeText = document.querySelector('#scene-error-text');
const restart = document.querySelector('#restart');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const timeline = createTimeline(config.timing);
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

function resize() {
  if (disposed || contextLost) return;
  debug?.cancel('Settings or viewport changed; restart the sample.');
  width = Math.max(1, canvas.clientWidth);
  height = Math.max(1, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.renderer.maxDpr, 2));
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
}

function syncLoop() {
  timeline.pause();
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
    dpr: renderer.getPixelRatio(), running, contextLost, restores, frames,
    elapsed: timeline.uniform.value, reducedMotion: motionPreference.matches,
    camera: world.camera.position.toArray(),
    drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
    programs: renderer.info.programs.length,
    wall: world.wall.snapshot(),
    curtain: world.curtain.snapshot(), capture: world.capture.snapshot(),
    touch: { ...world.field.snapshot(), ...pointers.snapshot() },
    particles: world.particles.snapshot(),
    effects: 'M5: touch field, water parting/foam, spray, touch bursts, shaft dust/mist; no visible shaft volume or postprocessing',
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
  renderer?.dispose();
}

try {
  notice.hidden = true;
  renderer = new WebGLRenderer({ canvas, antialias: true });
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
      debug = createDebugPanel({ config, resize, snapshot, renderer, resetTouch: world.field.reset, inspectTouch: world.field.inspect });
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
  import.meta.hot.dispose(dispose);
}
