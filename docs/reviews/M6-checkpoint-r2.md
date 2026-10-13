# M6 checkpoint — revision 2

- Mode: CHECKPOINT (focused re-check of the r1 blocker and its fix)
- Base SHA: `900eb9648d58cb68ad735915c9561f454c87aaff` (accepted M5)
- Previous checkpoint head: `392db933f75a70353dc4ee4ed5af7496565d7706` (r1, one blocker)
- Reviewed head SHA: `0a5d606fbb01c25eceeca3e469b86a2390ed9c1d` (`git rev-parse HEAD` verified)
- Review workspace: `scratchpad/m5-review` (detached at HEAD); preview at `http://127.0.0.1:5176/` (`--strictPort`)
- Reviewer: Claude
- Verdict: **DRAFT FEEDBACK**
- Advancement: **not approved by checkpoint**

## Blocking findings

None. The r1 blocker (the curtain-outline seam from encoding each pass separately) is resolved, and art tuning may proceed.

## Non-blocking findings

- **Small attenuation change at the lip.** With the curtain visible, the shaft contribution changes slightly faster across the lip and some left-edge bands than in the curtain-hidden reference. Lip jump vs. neighbours: 7.4 vs 5.7 (landscape) and 5.9 vs 5.0 (desktop), in 8-bit. This is the water's own `lipFade` attenuating the behind segment, not an encoding seam, and it is not visible at default intensity. Check it again after art tuning. Owner: builder. Due: M6 full review.
- **GPU cost unchanged.** Idle at 1440×900 DPR1, GPU median/p95 is 3.55/5.21 ms with the shaft off and 4.41/7.04 ms with it on (+0.86 / +1.83 ms). That is not worse than r1, even though the front pass now integrates the whole interval. The phone fill-rate risk and matched timing remain due at the full M6 review, unchanged from r1.
- **Prior nit resolved.** Beam fBm now uses `shaft.lacunarity` and `shaft.gain`, with GUI ranges.
- **Prior nit resolved.** Shaft debug views now hide all particles, and switching back to `shaft` restores each system's own enabled state; a system disabled in the meantime stays hidden.

## Evidence and rubric

| Check | Result | Observation (scripts and images in `review-scratch/`, `out-m6r2/`) |
| --- | --- | --- |
| Seam with the curtain hidden (shaft only, black rock/background/bounce, noise and streaks 0) | PASS | `seam.mjs` + `seam.py` at 1440×900 DPR1, 390×844 DPR2 and 844×390 DPR2; intensities 0.01, 0.05, 0.15 and 0.6. The curtain footprint comes from the `split` view. At four row bands on the left/right edges and at the lip, the jump across the edge equals the median jump at neighbouring offsets: for example desktop L y299 3.8 vs 3.8 at 0.05 and 3.9 vs 4.1 at 0.15. r1 measured 16.2 vs 4.8 and 62.6 vs 4.8 at the same spot. No rectangle is visible at 0.15 (`desk-hidden-0.15.png`). |
| Seam with the curtain visible (on minus off, average of 6 frames) | PASS | Edge jumps match their neighbours within about 1–2/255, apart from the small lip item above. In the default composite (`desk-default.png`) the beam crosses the curtain's left edge smoothly. |
| Water attenuates the behind part | PASS | Mean shaft contribution inside the footprint is 53.4 with the curtain visible vs 58.4 hidden (desktop), 52.8 vs 58.0 (portrait) and 53.6 vs 58.3 (landscape). Outside the footprint the two are identical. |
| Exact sum math | PASS | Both passes use the same jitter and sample positions. Behind pass: E(Lb). Front pass: max(E(Lb+Lf) − E(Lb), 0), which is non-negative because E is monotonic. `encodeBeam` uses Three's `toneMapping` (under `TONE_MAPPING`) and `linearToOutputTexel`, so it is identical to other materials. |
| `continue` and `discard` paths | PASS | No console or shader warnings in any run (3 orientations plus the views and timing runs). Pixels with zero contribution discard, and an empty behind segment discards the behind pass only. No visible holes or speckle at the curtain edges or lip. |
| Depth, cone and render order | PASS (unchanged since r1) | The delta does not touch depth, the cone interval or render order. |
| Tests/build | PASS | `npm ci`; `npm test` 23/23; `npm run build` OK (603.20 kB, existing chunk-size warning). |
| Phone | UNVERIFIED | Desktop Edge 155 emulation only. |

## Manual verification

1. In `?debug`, hide the curtain, set rock colour, bounce and background to black, and shaft intensity to 0.15 with noise and streaks at 0. Expected: a smooth cone with no rectangle at the curtain footprint.
2. Show the curtain at defaults. Expected: the beam continues smoothly across the curtain's left edge and the lip, and is slightly dimmer behind the water.
3. Cycle `shaft.view` through depth, segment, split and shaft. Expected: no particles in the debug views, and particles return in `shaft`.

## Gaps and next gate

Art tuning, glint balance, phone cost and the full-M6 matched timing remain open for the full M6 review of an exact head.
