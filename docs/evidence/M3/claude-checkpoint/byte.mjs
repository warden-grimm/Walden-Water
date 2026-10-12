import { connect } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const c = await connect();
const r = await c.ev(`(${async function () {
  const url = performance.getEntriesByType('resource').find(e => e.name.includes('/deps/three.js')).name;
  const T = await import(url); const { createScene } = await import('/src/scene/createScene.js'); const { config } = await import('/src/config.js');
  const W = 360, H = 225, out = {};
  for (const t of [0, 3]) for (const precision of ['auto', 'byte']) {
    const cfg = structuredClone(config); cfg.camera.drift = false; cfg.markers.opacity = 0; cfg.curtain.visible = false; cfg.refraction.precision = precision;
    const canvas = document.createElement('canvas'); const renderer = new T.WebGLRenderer({ canvas });
    renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping;
    const world = createScene(cfg, { value: t }, renderer); world.configure(W / H, false, W, H); world.updateCamera(false);
    const gl = renderer.getContext(); world.render(); const a = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, a);
    const direct = new T.Scene(); direct.background = new T.Color(cfg.renderer.background); direct.add(world.wall.mesh);
    renderer.render(direct, world.camera); const b = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, b);
    const hist = {}; let max = 0, at = null;
    for (let i = 0; i < a.length; i += 4) { const d = Math.max(Math.abs(a[i]-b[i]), Math.abs(a[i+1]-b[i+1]), Math.abs(a[i+2]-b[i+2])); hist[d] = (hist[d] || 0) + 1; if (d > max) { max = d; at = [(i/4)%W, Math.floor(i/4/W), [...a.slice(i,i+3)], [...b.slice(i,i+3)]]; } }
    out[precision + '@t' + t] = { format: world.capture.snapshot().format, max, at, hist };
    world.dispose(); renderer.dispose(); renderer.forceContextLoss();
  }
  return out;
}})()`);
writeFileSync(new URL('./out/byte-vs-direct.json', import.meta.url), JSON.stringify(r, null, 1)); console.log(JSON.stringify(r)); c.close();
