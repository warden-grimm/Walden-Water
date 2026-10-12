import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, MeshBasicMaterial, Raycaster, SRGBColorSpace, Vector3 } from 'three';
import { config } from '../src/config.js';
import { createCurtainGeometry, travelTime } from '../src/scene/curtainGeometry.js';
import { createWallCapture } from '../src/scene/WallCapture.js';
import { createProfiler } from '../src/debug/profiler.js';

test('ribbon raycasts return bottom-up UVs on the visible curved surface at both qualities', () => {
  for (const quality of ['reference', 'reduced']) {
    const s = { ...config.curtain, quality };
    const geometry = createCurtainGeometry(s), material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material); mesh.position.y = s.height / 2; mesh.updateMatrixWorld();
    for (const [u, v] of [[0.03, 0.03], [0.97, 0.97], [0.5, 0.5], [0.2, 0.8]]) {
      const x = (u - 0.5) * s.width, y = v * s.height;
      const hit = new Raycaster(new Vector3(x, y, 5), new Vector3(0, 0, -1)).intersectObject(mesh)[0];
      assert.ok(hit); assert.ok(Math.abs(hit.uv.x - u) < 1e-6); assert.ok(Math.abs(hit.uv.y - v) < 1e-6);
      const expectedZ = s.bow * (1 - (2 * u - 1) ** 2) * Math.sin(Math.PI * v);
      assert.ok(Math.abs(hit.point.z - expectedZ) < 0.0001);
    }
    assert.equal(geometry.index.count / 3, 2 * s[`${quality}Columns`] * s[`${quality}Rows`]);
    geometry.dispose(); material.dispose();
  }
});

test('constant flow phase moves down, accelerating; zero gravity remains defined', () => {
  const { lipSpeed: speed, gravity } = config.water;
  const distance = t => speed * t + 0.5 * gravity * t * t;
  for (const t of [0, 0.1, 0.5, 1, 1.5]) assert.ok(Math.abs(travelTime(distance(t), speed, gravity) - t) < 1e-12);
  assert.ok(distance(1.1) - distance(1) > distance(0.2) - distance(0.1));
  assert.equal(travelTime(3, 0.5, 0), 6);
});

test('wall capture restores destination on success/failure, rejects feedback, falls back and disposes replacements', () => {
  const outer = { name: 'outer' }, source = { children: [{ name: 'wall' }] }, camera = {};
  let active = outer, face = 2, mip = 3, fail = false, complete = true, rendered, disposed = 0;
  const gl = { FRAMEBUFFER: 1, FRAMEBUFFER_COMPLETE: 2, checkFramebufferStatus: () => complete ? 2 : 0 };
  const renderer = { autoClear: false, extensions: { has: () => true }, capabilities: { maxSamples: 4 },
    getRenderTarget: () => active, getActiveCubeFace: () => face, getActiveMipmapLevel: () => mip,
    setRenderTarget(t, f = 0, m = 0) { active = t; face = f; mip = m; }, getContext: () => gl,
    render(s, c) { rendered = active; assert.equal(s, source); assert.equal(c, camera); assert.equal(this.autoClear, true); if (fail) throw Error('test failure'); },
  };
  const settings = { wallResolution: 1, precision: 'auto', samples: 4 }, capture = createWallCapture(renderer, source, camera, settings);
  capture.resize(400, 200); capture.render();
  rendered.addEventListener('dispose', () => disposed++);
  const restore = () => { assert.equal(active, outer); assert.equal(face, 2); assert.equal(mip, 3); assert.equal(renderer.autoClear, false); };
  restore(); fail = true; assert.throws(capture.render, /test failure/); restore(); fail = false;
  renderer.setRenderTarget(rendered); assert.throws(capture.render, /separate/); assert.throws(() => capture.resize(800, 400), /active/);
  renderer.setRenderTarget(outer, 2, 3);
  settings.precision = 'byte'; capture.resize(400, 200); restore(); assert.equal(disposed, 1);
  assert.equal(capture.snapshot().format, 'SRGB8_ALPHA8');
  const retained = capture.texture.value; complete = false;
  assert.throws(() => capture.resize(800, 400), /No renderable/); restore(); assert.equal(capture.texture.value, retained);
  let framebufferChecks = 0; settings.precision = 'auto';
  gl.checkFramebufferStatus = () => ++framebufferChecks === 1 ? 0 : 2;
  capture.resize(800, 400); restore();
  assert.equal(framebufferChecks, 2); assert.equal(capture.texture.value.colorSpace, SRGBColorSpace);
  complete = true; capture.contextRestored(); assert.equal(capture.texture.value, null);
  capture.resize(400, 200); assert.notEqual(capture.texture.value, retained);
  capture.dispose(); assert.equal(capture.texture.value, null);
});

test('warmup disjoint does not poison subsequent valid GPU sample, sampling disjoint does', () => {
  const p = createProfiler({ capacity: 100, warmupSeconds: 1, sampleSeconds: 1 }, () => ({}));
  const sample = disjoint => {
    p.start(); p.record(1, 0.016, 1); p.invalidateGpu('warmup disjoint'); p.record(1001, 0.016, 1);
    p.recordGpu(1017, 2); if (disjoint) p.invalidateGpu('sampling disjoint'); p.record(2001, 0.016, 1);
    return p.status().result.renderCost;
  };
  assert.equal(sample(false).gpu.medianMs, 2); assert.equal(sample(true).gpu, null);
});
