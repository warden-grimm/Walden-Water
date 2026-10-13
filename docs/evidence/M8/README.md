# M8 evidence: post-processing, adaptive resolution, saved settings

Environment: Windows 11, isolated native Edge (CDP 9333, dedicated profile),
desktop GPU. Candidate `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`.
The M7 baseline is accepted `99d04e1`, served on 5175. This is Edge emulation,
**not** physical-phone evidence; adaptive resolution was exercised with a
synthetic load, not a real phone GPU. Contract:
[scene-contract § M8](../../scene-contract.md#m8-post).

## Display-space decision

- `linear-vs-direct.png` (portrait):
  - left: direct canvas render (= M7);
  - middle: a first version that rendered into a *linear* target and tone
    mapped once at the end, with every effect at zero;
  - right: that version's defaults.

  The water turns milky blue-white, because its alpha now blends in linear
  light. That changes the approved look, so this design was dropped.
- `display-space-vs-direct.png`: the shipped design.
  - left: direct;
  - middle: the post path with every effect at zero;
  - right: the first defaults.

  Left and middle match: mean pixel 46.45 vs 46.82, with differences only
  from animation between captures.
- `bloom-strengths.png`: crops at bloom 0.35/0.75, 0.25/0.8/0.3 (chosen
  default) and 0.2/0.85/0.25 (strength/threshold/radius). The default gives
  glints a soft glow without blown discs.

## Behaviour probe (`probe.mjs`)

`node docs/evidence/M8/probe.mjs docs/evidence/M8/<dir> <w> <h> <dpr> [adaptive]`
was run for `portrait` (390×844 DPR2, with the adaptive trace), `landscape`
(844×390 DPR2) and `desktop` (1440×900 DPR1). Each starts by resetting saved
settings, with drift off.

**Toggles.** Captures `post-default`, `bloom-off`, `vignette-off`, `grain-off`,
`all-off` (post disabled) and `zero-effects` (all three off):
- With post on, the target equals the canvas buffer (e.g. 780×1688) and bloom
  runs at half that (390×844).
- With all off there is no target and the draw count returns to M7's 14.
  Bloom adds 13 draws (high-pass, 10 blur, mip composite, blend) plus one
  composite: 28 total.
- Geometries/textures/programs stay at 13/18/22 across all toggles.
  Textures +12 over M7: the post target plus the bloom pass's 11 targets,
  allocated once.

**Adaptive** (portrait, `adaptive-trace.json`). Synthetic load
(`adaptive.simulateLoad`, ms per megapixel):

| Phase | Load | Level changes (t s within phase → scale, backoff) |
| --- | --- | --- |
| Overload | 40 | 5 → 1.5, 10 → 1 |
| Recovery | 0 | 9 → 1.5, 19 → 2 |
| Only 2× too slow | 18 | 3 → 1.5; 13 → 2 (fails), 17.5 → 1.5 ×2; 35.5 → 2, 40 → 1.5 ×4; 73.5 → 2, 78 → 1.5 ×8 |

- **Backoff, not oscillation.** In the third phase the retries come 10, 18
  and 33.5 s after the previous drop: each wait doubles, up to `recover` × 8.
- **Consistent sizes.** At every 0.5 s sample, canvas buffer, post target
  and wall capture equal round(CSS × ratio) (`adaptive-size-consistency`:
  true).
- **Touch mapping.** A finger at the same CSS point maps to the same curtain
  UV (0.5, 0.5668) at ratio 2 (start), 1 (overloaded) and 2 (recovered).
- **Metric fix found here.** The first version used the median frame
  interval. rAF timestamps snap to vsync, so a 41 fps page kept an 18 ms
  median and never reduced resolution. It now uses the mean interval
  (1/fps). Unit tests cover 57/60/120 Hz with no change, periodic 100 ms
  hitches with no change, overload, recovery, backoff and disable.

**Lifecycle.**
- *Context loss/restore with post on:* target and bloom rebuilt at the same
  sizes (`after-context-restore.png`).
- *Visibility:* a second tab in front hid the page, giving `running:false`
  and at most 2 frames while hidden; rendering resumed when it returned.

**Save/reset round trip.**
- Shaft intensity 0.2 was saved from the debug page.
  - `localStorage` held `{"camera":{"drift":false},"shaft":{"intensity":0.2}}`.
  - The **normal page** (no `?debug`) rendered with it
    (`normal-page-saved.png`, deliberately extreme).
  - A reloaded debug page reported `savedSettings: 2` and intensity 0.2.
- Reset cleared storage and restored 0.0225. The normal page was then back to
  defaults (`normal-page-reset.png`).

Console warnings/errors: 0 in all three viewports. Logged once: post/target
format lines.

## HMR

- `hmr.mjs`: `main.js`, `createScene.js`, `Particles.js`, `Pool.js` and
  `PostProcessing.js`, ×3 each, touch `auto` and `byte`: 30 cycles. Each kept
  touch, ripples and post active, one canvas, one GUI, counts 13/18/22, and
  splashed; 0 console warnings/errors.
- `hmr-restore.mjs` closes the carried M3 nit (due M8). After a context
  restore, an HMR of `main.js` or `createScene.js` logged 70 "WebGL:
  INVALID_OPERATION: delete: object does not belong to this context" warnings
  each. Three's dispose listeners for pre-loss objects point at the lost
  context's GL objects. Fix: after a restore, the HMR dispose reloads the page
  instead of hot-swapping (development only). Retest: 0 warnings, page
  running, one canvas/GUI (`hmr-restore.json`).

## Matched timing (`measure.mjs`)

M7's script with a `postoff` modifier. 1440×900, DPR1 (adaptive cannot change
DPR here), 10 s warmup + 60 s, alternating baseline/candidate. The display ran
at 60 Hz for this session.

| Run | Frames | Median / p95 ms | GPU median / p95 ms |
| --- | --- | --- | --- |
| m7-idle | 3600 | 16.7 / 16.8 | 4.747 / 5.565 |
| m8-idle | 3600 | 16.7 / 16.8 | 4.666 / 6.221 |
| m7-interaction | 3600 | 16.7 / 16.8 | 4.613 / 5.327 |
| m8-interaction | 3600 | 16.7 / 16.8 | 4.159 / 6.441 |
| m7-stress | 3600 | 16.7 / 16.7 | 4.728 / 5.542 |
| m8-stress | 3566 | 16.7 / 16.8 | 4.378 / 7.079 |
| m8-idle-postoff | 3600 | 16.7 / 16.8 | 4.707 / 5.846 |

**Disposition.**
- Frame median/p95 are unchanged in every pair, so the >10% trigger does not
  fire.
- GPU p95 rises 0.66–1.54 ms with post on.
- The GPU median is not higher (−0.1 to −0.45 ms). Elapsed-time queries on
  this desktop vary with the clock state between runs, so I read the median
  as "no measurable increase", not a saving.
- Post off returns close to M7.
- Phone cost: bloom at half resolution is 13 full-screen-fraction passes.
  On phones, adaptive resolution and the per-effect toggles are the levers;
  M9 owns the presets and real-device numbers.
