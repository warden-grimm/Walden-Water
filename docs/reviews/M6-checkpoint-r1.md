# M6 checkpoint — revision 1

- Mode: CHECKPOINT
- Base SHA: `900eb9648d58cb68ad735915c9561f454c87aaff` (accepted M5)
- Reviewed head SHA: `392db933f75a70353dc4ee4ed5af7496565d7706` (`git rev-parse HEAD` verified)
- Review workspace: `scratchpad/m5-review` (detached at HEAD); preview at `http://127.0.0.1:5176/` (`--strictPort`)
- Reviewer: Claude
- Verdict: **DRAFT FEEDBACK**
- Advancement: **not approved by checkpoint**

Draft feedback does not approve M6. The blocking finding below halts beam art tuning until it is fixed, because tuning on top of it would bake in the artifact.

## Blocking findings

1. **The beam is brighter wherever it crosses the curtain, with hard edges at the curtain sides and lip.** Location: `src/shaders/shaft.frag.glsl:95,111-112` together with the two-pass split in `src/scene/LightShaft.js:22-30`.
   - **Cause:**
     - The ray integral is split at the resting curtain into two passes.
     - Each pass applies `<tonemapping_fragment>` + `<colorspace_fragment>` (ACES then sRGB encode) on its own, and the results are added in display space.
     - Both curves are concave, so E(behind) + E(front) > E(behind + front).
     - Every pixel whose ray crosses the curtain footprint therefore gets more beam than its unsplit neighbour. The step appears exactly on the curtain's x = ±width/2 lines and the lip (y = height).
   - **The builder's wet-sheen explanation is refuted.** The step persists with `wet.sheen=false`, the curtain hidden, and rock, background and bounce all black: a pure shaft-only image. It also scales with intensity the way per-pass encoding predicts. 8-bit inside/outside ratios at the left edge, rows 300–380, 1440×900:
     - Intensity 0.01: 1.14 (mostly in the linear sRGB toe).
     - Intensity 0.05 (default): 70 → 96 (×1.37).
     - Intensity 0.15: ×1.50.
     - Intensity 0.6: saturated.
     - Lip edge: 69 → 78 at default.
   - **It shows in the normal composite.** At default settings with the curtain visible, the shaft's own contribution jumps 70 → 95 across the curtain's left edge (average of 6 frames, with the curtain and markers located in captures). The bright rectangle is visible by eye in `step-default-full.png` and `edge-G0.png`. The wide-cone and apex-in-view light tests show the same footprint rectangle.
   - **Consequence:** a hard beam intersection outlining the curtain, which the visual-intent rule forbids ("no … hard beam intersections"). Tuning intensity or core would only hide it.
   - **Minimal fix:** keep the sum exact for unoccluded rays.
     - The behind pass outputs E(Lb).
     - The front pass integrates both segments and outputs E(Lb + Lf) − E(Lb).
     - Alternatively, accumulate the linear beam in one target and encode once.
   - **Retest:** curtain hidden with black rock at intensities 0.05/0.15/0.6. Expect no step at x = ±1.4 m or at the lip. With the curtain visible, only the water's own transmission should change the beam inside the footprint.

## Non-blocking findings

- **GPU cost.** At 1440×900 DPR1, idle (desktop, display at about 57 Hz in both runs), GPU median/p95 is 3.53/5.34 ms with the shaft off and 4.55/7.67 ms with it on: +1.0 ms median (+29%) and +2.3 ms p95. The frame median moved 17.6 → 17.8 ms, so the trigger is not fired here. Two full-screen passes with 14 fBm samples at phone DPR2 (about 3 MP) are the main fill-rate risk. Consider a single full-screen pass, early-out of pixels outside the cone's screen bounds, or a half-resolution beam. Owner: builder. Due: M6 full review with a matched run.
- **Debug views get particles drawn over them.** The depth/segment/split views are overdrawn by particles (renderOrder 3+), so readings are polluted by dust and mist. Hide particles while a shaft debug view is active, or draw the debug view last. Owner: builder. Due: M6 full review.
- **Beam texture borrows water settings.** `beamTexture` borrows `water.lacunarity` and `water.gain`, so retuning water changes the beam. Give `config.shaft` its own pair. Owner: builder. Due: M6 full review.
- **Pre-existing context-restore warnings.** HMR after a forced context restore still logs "object does not belong to this context" warnings. This is the existing M8 item.

## Evidence and rubric

| Check | Result | Observation (scripts and images in `review-scratch/`, `out-m6/`) |
| --- | --- | --- |
| Depth source | PASS | Resolved MSAA `DepthTexture` from the same-frame wall capture (`m6depth.mjs`). Portrait with particles off: depth views for samples 0, byte capture, wallResolution 0.5, three orientation round trips, context loss/restore and HMR are all within 0–5/255 of the reference. Most variants have 0% of pixels off by more than 3; half resolution has 0.001%. Landscape differences are only particles. Textures stay at 5 after rebuilds (the old depth texture is disposed). |
| Linearisation, near/far | PASS | With the wall flat (displacement off), the centre distance reads 10.0 m against 9.388 + 0.6 = 9.99 expected in landscape, and 11.27 m against 11.25 in portrait. The row profile follows 1/cos out to a 39.7° half-angle, matching the 42° vertical FOV at aspect 2.16. Unprojection uses the live `projectionMatrixInverse` and `matrixWorld`; no-hit maps to `camera.far`. |
| Cone interval | PASS | The algebra was checked case by case: camera inside, outside, inside the backward nappe, parallel (a≈0), and through the apex. Moved-light runs (camera inside a 30° cone, apex on screen, cone pointing away, grazing 10° cone through the camera, 60° cone): no NaNs, backward-nappe leaks or seams, and no console warnings. The GUI range keeps half-angles at 40° or less. |
| Curtain split | **FAIL** | See blocker 1. The split geometry itself is correct (split view); the error is in output encoding. |
| Render-order isolation | PASS | The shaft is not in the wall capture scene (`sourceObjects: ['wall']`). It samples only the capture's depth, never its own output target. Behind pass: transparent renderOrder 0, after the opaque background and before the water (1). Front pass: 2.5. |
| Hard clipping/sorting | PASS except the blocker | The soft depth fade removes wall-contact lines (`raised-smooth`). Additive blending means no sorting issue. |
| Tests/build | PASS | `npm ci`; `npm test` 23/23; `npm run build` OK (602.10 kB, existing chunk-size warning). |
| Phone | UNVERIFIED | Desktop Edge 155 emulation only. |

## Manual verification

1. In `?debug`, hide the curtain, set rock colour, bounce and background to black, and shaft intensity to 0.15 with noise and streaks at 0. Expected after the fix: a smooth beam with no rectangle at the curtain footprint.
2. Restore defaults. Expected: no visible beam step at the curtain's left edge or at the lip.
3. Switch the shaft view to depth, rotate, then force context loss/restore. Expected: an unchanged greyscale distance image.
4. Move the light so the camera sits inside the cone. Expected: a uniform haze, with no seams.

## Gaps and next gate

Art tuning, glint balance against the beam, phone cost, and the full-M6 matched timing remain open. The full M6 review must use the exact head after blocker 1 is fixed.
