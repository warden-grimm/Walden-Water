// Reviewer probe: isolated second renderer inside the 5175 page (does not touch the live app's config).
import { connect } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const c = await connect();
await c.send('Runtime.enable');
const result = await c.ev(`(${async function () {
  const url = performance.getEntriesByType('resource').find(e => e.name.includes('/deps/three.js')).name;
  const T = await import(url);
  const { createScene } = await import('/src/scene/createScene.js');
  const { config } = await import('/src/config.js');
  const W = 360, H = 225;
  const cfg = structuredClone(config); cfg.camera.drift = false; cfg.markers.opacity = 0; cfg.refraction.strength = 0;
  const canvas = document.createElement('canvas');
  const renderer = new T.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.info.autoReset = false;
  const time = { value: 3 };
  const world = createScene(cfg, time, renderer);
  world.configure(W / H, false, W, H); world.updateCamera(false);
  const gl = renderer.getContext();
  const read = () => { const p = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, p); return p; };
  const cmp = (a, b) => { let max = 0, n = 0; for (let i = 0; i < a.length; i += 4) for (let k = 0; k < 3; k++) { const d = Math.abs(a[i + k] - b[i + k]); if (d) n++; if (d > max) max = d; } return { max, changedChannels: n }; };
  // 1. Draw order and destination of every draw.
  const log = [];
  const names = ['background', 'curtain', 'lipMarker', 'poolMarker', 'camera'];
  world.scene.children.forEach((o, i) => { o.userData.probe = names[i]; });
  world.wall.mesh.userData.probe = 'wall';
  const hook = o => { o.onBeforeRender = r => log.push(o.userData.probe + '@' + (r.getRenderTarget() === null ? 'screen' : 'capture')); };
  world.scene.traverse(o => o.isMesh && hook(o)); hook(world.wall.mesh);
  const exposure = renderer.toneMappingExposure, clear = renderer.getClearColor(new T.Color()).getHex(), clearAlpha = renderer.getClearAlpha();
  world.render();
  const order = log.slice();
  const stateKept = { exposure: renderer.toneMappingExposure === exposure, clear: renderer.getClearColor(new T.Color()).getHex() === clear, clearAlpha: renderer.getClearAlpha() === clearAlpha, target: renderer.getRenderTarget() === null, colorSpace: renderer.outputColorSpace, toneMapping: renderer.toneMapping === T.ACESFilmicToneMapping };
  // 2. Single output conversion: composite with curtain hidden vs drawing the wall directly to the canvas.
  world.scene.children[1].visible = false;
  world.render(); const composite = read();
  const direct = new T.Scene(); direct.background = new T.Color(cfg.renderer.background);
  const wallParent = world.wall.mesh.parent; direct.add(world.wall.mesh);
  renderer.setRenderTarget(null); renderer.render(direct, world.camera); const directPx = read();
  wallParent.add(world.wall.mesh);
  const halfVsDirect = cmp(composite, directPx);
  cfg.refraction.precision = 'byte'; world.configure(W / H, false, W, H); world.render(); const byteComposite = read();
  const byteVsDirect = cmp(byteComposite, directPx);
  const byteFormat = world.capture.snapshot().format;
  cfg.refraction.precision = 'auto'; world.configure(W / H, false, W, H);
  // 3. Flow direction/acceleration from the rendered flow-band view (center column).
  world.scene.children[1].visible = true; cfg.water.view = 'flow bands'; world.configure(W / H, false, W, H);
  const column = () => { const p = read(), col = []; for (let y = 0; y < H; y++) col.push(p[(y * W + W / 2) * 4]); return col; };
  // Locate curtain rows on screen via UV view
  cfg.water.view = 'uv'; world.configure(W / H, false, W, H); world.render();
  const uvPx = read(); const vAt = []; for (let y = 0; y < H; y++) { const i = (y * W + W / 2) * 4; vAt.push(uvPx[i + 3] ? uvPx[i + 1] : -1); }
  cfg.water.view = 'flow bands'; world.configure(W / H, false, W, H);
  const peaks = col => { const p = []; for (let y = 1; y < H - 1; y++) if (col[y] > 200 && col[y] >= col[y - 1] && col[y] > col[y + 1]) p.push(y); return p; };
  time.value = 3; world.render(); const c0 = column();
  time.value = 3.03; world.render(); const c1 = column();
  const p0 = peaks(c0), p1 = peaks(c1);
  // 4. NaN probe at GUI extremes: render water view into a float target with tone mapping disabled path is not possible; check finite output by reading float target.
  const ft = new T.WebGLRenderTarget(W, H, { type: T.FloatType });
  const probeExtremes = {};
  for (const [label, w] of Object.entries({ minLipMaxStepG0: { lipSpeed: 0.1, normalStep: 0.02, gravity: 0 }, minLipMaxStepG5: { lipSpeed: 0.1, normalStep: 0.02, gravity: 5, normalStrength: 3, gloss: 5, glint: 8 }, minStep: { normalStep: 0.001, lipSpeed: 2, gravity: 5 } })) {
    Object.assign(cfg.water, { view: 'water' }, w); world.configure(W / H, false, W, H);
    world.capture.render(); renderer.setRenderTarget(ft); renderer.render(world.scene, world.camera);
    const f = new Float32Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, f);
    let nan = 0, inf = 0; for (const x of f) { if (Number.isNaN(x)) nan++; else if (!Number.isFinite(x)) inf++; }
    probeExtremes[label] = { nan, inf, glError: gl.getError() };
    renderer.setRenderTarget(null);
  }
  ft.dispose();
  const info = { calls: renderer.info.render.calls };
  world.dispose(); renderer.dispose(); renderer.forceContextLoss();
  return { order, stateKept, halfVsDirect, byteVsDirect, byteFormat, flow: { p0, p1, vAt0: p0.map(y => vAt[y]), vAt1: p1.map(y => vAt[y]) }, probeExtremes, info };
}})()`);
writeFileSync(new URL('./out/inpage.json', import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 1));
c.close();
