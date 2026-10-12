// Injected into the page: isolated renderer + field, deterministic deltas. No app state touched.
window.__H = (async () => {
  const T = await import('/node_modules/.vite/deps/three.js?v=4ca30207');
  const { createTouchField } = await import('/src/interaction/TouchField.js');
  const { config: base } = await import('/src/config.js');
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 4;
  const renderer = new T.WebGLRenderer({ canvas });
  function make(over = {}) {
    const config = structuredClone(base); Object.assign(config.touch, over.touch || {}); Object.assign(config.water, over.water || {});
    const pointers = { count: { value: 0 }, segments: Array.from({ length: 10 }, () => new T.Vector4()), strengths: new Float32Array(10), clear() { this.count.value = 0; } };
    const field = createTouchField(renderer, config, pointers); field.configure();
    return { config, pointers, field,
      hold(list) { pointers.count.value = list.length; list.forEach(([u0, v0, u1, v1, s], i) => { pointers.segments[i].set(u0, v0, u1 ?? u0, v1 ?? v0); pointers.strengths[i] = s; }); },
      run(seconds, dt) { const n = Math.round(seconds / dt); for (let i = 0; i < n; i++) field.update(dt); },
      // time (s) until max reaches exactly 0, stepping dt, cap seconds
      untilNeutral(dt, cap = 20, check = 0.05) { let t = 0, r; while (t < cap) { this.run(check, dt); t += check; r = field.inspect(); if (r.max === 0 && r.minX === 0 && r.maxX === 0) return { t: +t.toFixed(3), r }; } return { t: null, r }; } };
  }
  return { T, renderer, make, gl: renderer.getContext() };
})();
