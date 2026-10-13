# M7 review — revision 1

- Mode: MILESTONE (M7 — Pool and impacts)
- Base SHA: `d02b1975ca43f1a9ff323bdfebd36eb3e316d824` (accepted M6)
- Reviewed head SHA: `6d9dddda5644406e999624f5689ae4735fd1d177` (`git rev-parse HEAD` matches)
- Review workspace: `…/scratchpad/m5-review` (detached at HEAD); M6 baseline exported with `git archive` to `…/scratchpad/m7-base`
- Reviewer: Claude
- Verdict: **CHANGES REQUESTED**
- Advancement: **blocked**

## Blocking findings

1. **The ripple domain does not cover the visible pool in landscape or desktop, so droplets that land there make no ring, or a ring cut off along a straight line.** Files: `src/config.js:47` (`rippleHalfWidth: 3`), `tests/pool.test.js:7-25`, `REVIEW_NOTES.md:393,410`.
   - **Claim.** The notes and contract say the ±3 m × −1…3 m rectangle "covers the visible pool in all orientations (tested). Landings beyond it are off screen." That is false for x. The test checks only the frustum's front edge in **z**. In x it checks only the curtain base spread.
   - **Measurement.** At 844×390 the pool-line marker (±1.56 m) spans device px 675–1012 of 1688. That puts the screen edge at about ±7.8 m along the base line. In portrait (±1.9 m) the domain does cover it.
   - **Reproduction.** Run `review-scratch/m7edge.mjs` at 844×390 DPR2 with `pool.view = ripples`. A fast rightward swipe low on the right half of the curtain throws droplets past x = 3 m on visible pool.
     - Rings stop at a diagonal seam, which is the x = 3 domain edge in perspective. Rings whose centre lies past it are absent. Rings straddling it are half-cut (`out-m7/edge/c-ripples-750.png`, `out-m7/landscape/edge-zoom.png`).
     - With `rippleHalfWidth` 4.5, the same swipe rings out to about 4.4 m (`c-ripples-wide.png`).
     - In the default pool view these rings are visible as faint ellipses (`c-pool-750.png`), so the gap shows up in normal use.
   - **Consequence.** This fails the M7 check "rings occur where droplets reach pool height". The coverage evidence is also wrong.
   - **Minimal fix.** Size the x half-width to cover the farthest reachable landing on visible pool for the supported aspects. For example, derive it from burst speed × flight + curtain half-width (about 4.5 m), or from the frustum. Keep the texels square (resolution or memory trade-off noted). Extend `pool.test.js` to assert x coverage of reachable landings, or of the visible pool corners, for 844×390, 1440×900 and aspect 3.
   - **Retest.** Repeat the landscape and desktop right-swipe in the ripples and pool views: no seam, rings at every visible landing. Re-run the byte path and matched timing if the target grows.

## Non-blocking findings

- **Spray rings cut off early.** A spray point's ring is cut off when that point's next base drop lands. `ringLife` 1.2 s is longer than the base loop period of 0.34–1.15 s, and `ring-spray.vert.glsl:15-26` keeps only the latest landing. The result is a small pop in a subtle ring. Fix: cap the spray ring life at the period, or fade the old ring out. Builder; M9 tuning.
- **Per-frame array allocation.** `Pool.js:137` builds the `['spray', 'bursts']` array literal every frame. Hoist it to a module constant. Builder; M8.
- **Stale shader header.** The header of `pool.frag.glsl:1-6` still describes intersecting a "wall plane". The shader now ray-marches the rock depth range. Builder; M8.
- **Carried items.** Shaft/pool/mist phone fill cost and presets, including `reflectionSteps`, `rippleResolution` and `mist` (M9). Also the haze drift ratio, burst saturation, seeds and noise precision (M9), and HMR-after-restore warnings (M8). Builder.

## Evidence and rubric

| Category/check | Result | Command, observation, artifact, or reason |
| --- | --- | --- |
| Scope/spec | PASS | Diff covers the pool, rings, low mist, shared chunks and integration, plus the config-only beam halving (`adafab5`: `shaft.intensity` 0.045→0.0225, no code). No future-milestone work. |
| Shared launch refactor (M5 unchanged) | PASS | `spray-launch.glsl`/`burst-launch.glsl` are a line-for-line move of the M5 math. Timing, `fresh`, origin, velocity and life are unchanged. The only behaviour change is the documented `origin.y = min(origin.y, uHeight)` lip clamp; a lip press shows no droplets above the lip marker (`out-m7/hmr/lip.png`). Ring materials reuse the droplet geometry and the *same uniform objects* (spread references; `bind` mutates `.value` only), and they render in the same frame/`uTime`. |
| Ring timing/mapping | FAIL (x domain) | Contract mapping u=(x−xMin)/xSize, v=(z−zMin)/zSize is identical in `ring-common` and `pool.frag`. Impact rings with `impactDepth` 0 sit exactly on the pool-line marker in all 3 viewports (`map-impact-z0.png`). Burst rings appear in front of the sheet as droplets land and are gone by ~1.2 s (`burst-sheet.png`). Blocker 1: no rings beyond x=±3 m on visible pool. |
| Shader/field | PASS | R/G split non-negative encoding; ONE,ONE additive (premultiplied); FB-complete check; RGBA16F→RGBA8 fallback; no self-sampling; target/face/mip/autoClear restored in `finally`. |
| Bounded counts/lifetimes | PASS | 40 + 720 + 3072 ring vertices fixed; rings retire at `ringLife`; spray/burst rings only for landed drops (lip drops never land at defaults: max land need vary≥1.46 > 1.4). |
| Interaction | PASS (desktop emulation) | Swipes splash in 3 viewports (7/4/7 bursts), and still splash after a context restore. Phone touch: UNVERIFIED. |
| Mobile/lifecycle | PASS / phone UNVERIFIED | Byte path RGBA8 576×384. Pool off: draws 14→10, triangles 227,082→227,080. Context restore: target reallocated, geometries/textures/programs back to 11/6/13. 6 HMR cycles (Pool.js and Particles.js, identical bytes): counts stable at 14/11/6/13, one canvas, 0 warnings/errors. Portrait crop: the pool is the bottom ~17% of the frame. |
| Performance | PASS | Matched runs, 1440×900 DPR1, 10 s warmup + 60 s, display ~57 Hz. Frame time is unchanged within 0.6% (table below). GPU cost: about +0.1 ms median and +0.5 ms p95 (+6–8%), under the 10% trigger. Draws 9→14. Only per-frame allocation is the nit above. |
| Visual intent | PASS | Dark pool with a foam/churn line, wobbling dim reflections and faint mist. The halved beam remains the focal point and fades before the pool; the pool stays subordinate to it. Motes/mist behind the sheet are dimmed via `curtainTransmission` (source; invisible at defaults). Shaft seam/depth code unchanged except the pool clip. |
| Maintainability | PASS | Config/GUI ranges, commented shared chunks (`shaderChunks.js`), disposal of target/materials/impact geometry. |

Matched timing, frame and GPU columns in ms (`review-scratch/timing7/*-timing.json`):

| Run | Frame median | Frame p95 | GPU median | GPU p95 |
| --- | --- | --- | --- | --- |
| M6 idle | 17.7 | 18.1 | 4.552 | 7.256 |
| M7 idle | 17.6 | 18.1 | 4.657 | 7.726 |
| M6 stress | 17.8 | 18.1 | 4.531 | 7.265 |
| M7 stress | 17.7 | 18.1 | 4.619 | 7.833 |

Commands: `npm ci`, `npm run build` (pass, existing chunk-size warning), and `npm test` (26/26). Review preview: `npm run dev -- --host 127.0.0.1 --port 5176 --strictPort`. M6 baseline on 5177. Probes: `review-scratch/m7probe.mjs`, `m7edge.mjs`, `m7hmr.mjs`; output in `review-scratch/out-m7/`.

Environment: Windows 11, isolated Edge via CDP :9333, desktop GPU. Viewports 390×844 DPR2, 844×390 DPR2 and 1440×900 DPR1, with touch emulation. `maxPointSize` 1024. This is not phone evidence.

## Manual verification

1. In landscape `?debug`, set pool → view ripples and swipe fast to the right, low on the curtain. Rings should appear wherever droplets land, with no diagonal seam right of the curtain. **This fails at HEAD.**
2. Set markers.opacity 1 and impactDepth 0. Impact rings should sit on the pool-line marker.
3. Set pool.precision byte, then auto; set pool.enabled off, then on. Rings and the pool should persist, with no console errors.
4. Force a context loss and restore, then swipe. Landing rings should appear again.
5. **Phone (portrait and landscape):** pool look and crop, ring visibility, beam still the focal point, smoothness. UNVERIFIED.

## Gaps and next gate

- Phone look, cost and touch are unverified, and M9 owns the phone presets.
- The reflection omits the shaft, particles and touch parting (documented).
- Re-review requires the blocker 1 fix and its retest on a new exact head. Approval applies only to that head.
