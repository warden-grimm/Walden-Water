# M7 review — revision 2

- Mode: MILESTONE (M7 — Pool and impacts), focused re-review of the r1 blocker fix
- Base SHA: `d02b1975ca43f1a9ff323bdfebd36eb3e316d824` (accepted M6)
- Reviewed head SHA: `99d04e116e76b8eef4ebd47bebb9d3dd191310f1` (`git rev-parse HEAD` matches; fix commit on top of r1 head `6d9dddd`)
- Review workspace: `…/scratchpad/m5-review` (detached at HEAD; the only untracked content is `review-scratch/`); M6 baseline export at `…/scratchpad/m7-base`
- Reviewer: Claude
- Verdict: **APPROVE WITH NITS**
- Advancement: **permitted** (for this exact head and scope; phone checks remain UNVERIFIED)

## Blocking findings

None. The r1 blocker (ripple domain ±3 m left visible landscape/desktop landings without rings, or with rings cut at a seam) is resolved:

- **Wider target.** `src/config.js:47` widens the target to `rippleHalfWidth` 4.5 m, which gives 864×384 at the same 96 texels/m (square texels).
- **Edge fade.** `pool.frag.glsl` replaces the hard `step` domain mask with a `smoothstep` fade over `rippleEdge` (0.25 m) inside every edge. A ring is weighted to zero before it reaches the target's border. Point sprites centred outside the target were already invisible, so there is no discontinuity.
- **Test.** `tests/pool.test.js` now asserts sideways reach: about 4.06 m against 4.25 m fully weighted.

## Non-blocking findings

- **Reach claim depends on an uncapped speed.** The contract says the visible pool is wider "than droplets reach", and the test uses `bursts.fullSpeed` (3 m/s) as the swipe speed. But `fullSpeed` only saturates *strength*. `SplashEmitter.js:64` throws with the raw `dragX * throw`, and `PointerTracker.js:120-122` does not clamp velocity. So a very fast flick can still land a droplet beyond 4.5 m on visible landscape/desktop pool. That droplet now produces a softly faded ring, or none, rather than a seam. This is acceptable behaviour. Either reword the contract and test comment ("typical full-strength swipe"), or clamp the throw speed. Owner builder; due M9 (presets/tuning).
- **Spray ring cut short (kept from r1).** A spray point keeps only its latest ring, so the ring ends when the next drop lands (`ring-spray.vert.glsl`). Owner builder; due M9.
- **Carried items.** Phone fill cost and presets (now including the larger ripple target), the haze drift ratio, burst saturation, seeds and noise precision are due M9. HMR-after-restore warnings are due M8. Owner builder.
- **Closed r1 nits.** The per-frame `['spray','bursts']` literal is hoisted to `DROPLET_SOURCES` (`Pool.js:17`). The `pool.frag.glsl` header now describes the depth-range march.

## Evidence and rubric

| Category/check | Result | Command, observation, artifact, or reason |
| --- | --- | --- |
| Scope/spec | PASS | `git diff 6d9dddd..99d04e1` changes `config.js`, `Pool.js`, `pool.frag.glsl` and `pool.test.js`, plus docs, evidence and the archived r1 report. No unrelated changes. |
| Ring coverage (r1 blocker) | PASS | `review-scratch/m7edge2.mjs` at 844×390 DPR2 and 1440×900 DPR1, ripple and pool views at 400–1600 ms. **r1 swipe:** rings form out to about 4.3 m and fade softly toward the edge with no straight cut (`out-m7r2/landscape/r1-edge-zoom.png`, `sheet-r1.png`; desktop `sheet-r1.png`). **Harder full-width mid-height swipe:** a few far landings at about x 4 m fade, no seam (`sheet-hardMid.png`). **Hard high swipe:** most droplets retire in the air (lifetime 1.6 s) and make no ring by design (`sheet-hardHigh.png`). |
| Mapping / M5 identity | PASS (unchanged since r1) | Ring and droplet GLSL is untouched by the fix. The domain uniform feeds both the ring shaders and the pool shader. Restore-then-swipe rings still sit in front of the sheet where droplets land (`probe-landscape/restored-ripples.png`). |
| Shader/field | PASS | Byte path is RGBA8 864×384 and auto is RGBA16F 864×384, per the format log lines. The fade multiplies the ring slope and foam, and also the ripple debug view, consistently. |
| Interaction | PASS (emulated) | Swipes splash before and after a context restore; 3–9 bursts per swipe. 0 console warnings/errors. Phone touch: UNVERIFIED. |
| Mobile/lifecycle | PASS / phone UNVERIFIED | `m7probe.mjs` in portrait and landscape: start, byte and pool-on all give draws/triangles/geometries/textures/programs of 14 / 227,082 / 11 / 6 / 13–14. Pool off gives 10 / 227,080. After restore the counts return to 14 / 227,082 / 11 / 6 / 13 and the target is reallocated. HMR is unaffected by the fix (6 cycles in r1); I did not repeat it. |
| Performance | PASS | Matched runs, 1440×900 DPR1, 10 s warmup + 60 s, display ~57 Hz. Frame time is unchanged. GPU: +0.07–0.15 ms median and +0.48–0.65 ms p95 (+6.6–9.0%, under the 10% trigger). The larger target adds no measurable cost over r1. CPU submit is +0.1 ms. |
| Visual intent | PASS | Pool unchanged at defaults; the beam remains the focal point. |
| Maintainability | PASS | `rippleEdge` has a GUI range and a test check. The contract and evidence are updated, with the reach-wording nit above. |

Matched timing in ms (`review-scratch/timing7r2/*-timing.json`):

| Run | Frames | Frame median / p95 | GPU median / p95 |
| --- | --- | --- | --- |
| M6 idle | 3383 | 17.8 / 18.1 | 4.506 / 7.177 |
| M7 idle | 3385 | 17.7 / 18.1 | 4.654 / 7.653 |
| M6 stress | 3385 | 17.8 / 18.1 | 4.545 / 7.192 |
| M7 stress | 3389 | 17.7 / 18.1 | 4.618 / 7.840 |

Commands:

- `npm run build`: pass, existing chunk-size warning. The r1 `npm ci` tree was reused because the dependencies are unchanged in this diff.
- `npm test`: 26/26, including the new sideways-reach assertion.
- Preview: `npm run dev -- --host 127.0.0.1 --port 5176 --strictPort`, with the M6 baseline on 5177. I stopped both afterwards.

Environment: Windows 11, isolated Edge via CDP :9333, desktop GPU, touch emulation. Viewports 390×844 DPR2, 844×390 DPR2 and 1440×900 DPR1. This is not phone evidence.

## Manual verification

1. In landscape `?debug`, set pool → view ripples and swipe fast to the right, low on the right half of the curtain. Rings should appear at the landings and fade softly near x ≈ 4.3 m, with no diagonal seam.
2. Repeat in the pool view. Faint ring ellipses should appear to the right of the curtain with no straight-edge artefact.
3. Set pool.precision byte, then auto; set pool.enabled off, then on; force a context loss and restore, then swipe. Rings should return, with no console errors.
4. **Phone (portrait and landscape):** pool look and crop, ring visibility, beam still the focal point, smoothness. UNVERIFIED.

## Gaps and next gate

- Phone look, cost and touch are unverified (M9).
- The reflection omits the shaft, particles and touch parting (documented).
- Very fast flicks can land beyond the faded ripple edge (nit).
- M7 approval applies only to `99d04e116e76b8eef4ebd47bebb9d3dd191310f1`. M8 may start from this head.
