# Claude M2 r1 reviewer evidence (head 0354151a78de0eaa228d58591d3618aa43358c51)

Captured 2026-10-12. Windows 11, Edge 155.0.4283.45 (isolated profile, CDP :9334, occlusion/backgrounding disabled),
NVIDIA RTX A4500 via ANGLE D3D11. Reviewer checkout served on 127.0.0.1:5175 (strict); M1 base exported via
`git archive 6af1797` into `m1-base/` (node_modules removed) and served on :5176 for the matched run. Desktop only, not phone evidence.

- `review.mjs` -> `claude-checks.json` + PNGs: GUI inventory, orientations, ultrawide 16:3 and 8:1, quality-toggle disposal,
  toggles, light move, normal/face-normal agreement probe (temporary wall.frag edit, SHA-256 restored), 3 context cycles,
  5 HMR cycles (config.js append, SHA-256 restored), reduced motion, native tab visibility, console.
- `trickle.mjs`: downward wet-trickle shift (trickle-slow-a/b.png).
- `warnings.mjs` -> `warnings-m1.json`, `warnings-m2.json`: HMR-after-context-restore WebGL warnings in M1 and M2.
- `measure.mjs` -> `*-timing.json`, `perf.log`: 10 s warmup + 60 s samples (M1 base, M2 reference/reduced, 5120x2880 stress, after restores).
- `cdp.mjs` (port 9334 copy of the builder helper), `png.mjs` (zlib PNG decoder). Report: docs/reviews/M2-review-r1.md.
