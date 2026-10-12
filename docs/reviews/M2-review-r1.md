# M2 review — revision 1

- Mode: MILESTONE (M2 — wet rock and shared light contract)
- Base SHA: `6af1797edb83f5677eb46ff49b92b713181e0240`
- Reviewed head SHA: `0354151a78de0eaa228d58591d3618aa43358c51` (`git rev-parse HEAD` verified before diffing; worktree clean)
- Review workspace: Orca `claude-m2-review`, `C:/Users/Adam Tate/orca/workspaces/Walden-Water/claude-m2-review`
- Reviewer: Claude
- Verdict: APPROVE WITH NITS
- Advancement: permitted (M3 may start; nits below carry owner/due gates)

## Blocking findings

None.

## Non-blocking findings

1. `src/shaders/wall.vert.glsl:28-32` — the displacement is time-invariant, yet every frame evaluates `surface()` five times per vertex (≈34 value-noise calls; ≈2.2 M per frame at 256×256). On my RTX A4500 it is hidden (see performance), but it is avoidable phone cost. Bake position/normal on `configure()` (or a one-shot GPU pass), or record measured phone cost justifying the per-frame path, before choosing the mobile preset. Owner: builder. Due: M4 phone runs (latest M9).
2. `src/shaders/wall.frag.glsl:22,28` and ledge silhouettes — single-octave, axis-aligned value noise reads as visible square cells in albedo and as rectangular wet blocks (`displacement-off.png`, `dispoff-zoom.png`, `rock-reference.png`); sharp shelves show stair-stepped rims because 256 segments undersample them (`rock-reference-zoom.png`). Rock still reads as dark, 3D and wet, so this is polish. Owner: builder. Due: M3 (re-judge under the real curtain).
3. `src/shaders/wall.frag.glsl:27` vs `docs/scene-contract.md:26` — wetness is bounded only in x; streaks continue above the lip (y>6) and below the pool line (`wet-mask.png`). Bound in y or document the intent. Owner: builder. Due: M3.
4. Small consistency items: contract line 52 says bounce lights "unlit rock only" but the shader adds bounce everywhere; `src/scene/Wall.js:52` duplicates the view list instead of using `choices.wall.view`; `src/scene/createScene.js` gained a UTF-8 BOM; `src/debug/profiler.js:32-33` lets a disjoint event during warm-up invalidate the whole sample's GPU data and the panel then shows blank rather than "invalid" (`panel.js:39`). Owner: builder. Due: M3.
5. Pre-existing (also in M1 base): HMR after a forced context loss logs "WebGL: INVALID_OPERATION: delete: object does not belong to this context" warnings from three's disposal (M2: 30, M1: 18; zero without a prior restore; zero errors). Dev-only, rendering resumes. Owner: builder. Due: M8 lifecycle validation.

## Evidence and rubric

| Category/check | Result | Command, observation, artifact, or reason |
| --- | --- | --- |
| Scope/spec | PASS | Source diff is 20 non-evidence files (+605/−81): rock vertex/fragment shaders, shared light, camera extraction, wall framing, GPU timer, tests, contract. No curtain/interaction/particle work, no dependency or Vite/workflow change. Custom light uniforms are the permitted SpotLight equivalent. |
| Shader/field — normals vs displacement | PASS | Normals are central differences of the same `surface()` (incl. y-fold); back faces flipped via `gl_FrontFacing`. Independent probe (temporary shader edit, bytes restored, SHA-256 identical) compared interpolated N with rasterized face normal `cross(dFdx,dFdy)`: reference 89.6% of pixels within ~18° (cos>0.95), 2.9% beyond ~37°; reduced 74.2% / 8.9%; displacement off 99.8% (flat). Disagreement sits on shelf rims (tessellation, nit 2), not wrong math. |
| Shader/field — toggles, relief, moss, wet glints | PASS | Displacement off flattens position and normal; sheen off removes wet speculars only. Crevice moss is restrained. Wet sheen is confined to the curtain footprint in x and moves downward: at trickleSpeed 0.05 a 1.72 s interval shifted the wet pattern 9 px down (expected ≈10 px). Glints follow the moved light (`light-mask-moved.png`, `rock-light-moved.png`). Field/FBO checks N/A until M4. |
| Interaction | N/A (M4) | No input code added; nothing in M2 blocks curtain raycasts. |
| Mobile/lifecycle | PASS (desktop) | Ordinary URL: no GUI/debug, 1 canvas. 390×844@3 → 780×1688 (DPR capped 2); 844×390@2; 3840×720 wall 45.9 m wide; 5760×720 (8:1, past the tested 6:1) wall 68.6 m, no edge visible. 8 reference/reduced toggles kept 2 geometries. 3 context cycles: sample cancelled, rendering resumes, 2 geometries/2 programs, timer extension re-acquired. 5 HMR cycles: 1 canvas, 1 GUI, 2 geometries/2 programs, running. Reduced motion zeroes drift. Native tab switch: frames/time frozen while hidden, resume adds ~0.5 s of visible time only. Physical phone not tested (not due at M2). |
| Performance | PASS (desktop) | See table. Frame median/p95 unchanged vs a freshly measured M1 base; no >10% trigger. Cost/fidelity: reduced removes 75% of wall triangles and visibly loses rim detail; GPU timing on this desktop cannot rank presets reliably. Phone cost UNVERIFIED and correctly deferred. |
| Visual intent | PASS | Dark blue-grey rock, upper-left warm beam on the upper-middle curtain area, fading toward the pool; no uniform gloss/brightness. Polish in nit 2. Shaft volume/water are M3/M6. |
| Maintainability/deployment | PASS | GUI inventory: every config key except fixed diagnostics has a controller (0 missing); rebuild controls labelled `(rebuild)` and use `onFinishChange`. Shared light uniforms are spread by reference, mutated in place, unit-tested for identity, ordered cone and clamped fade, world-space only — usable by M3/M5/M6. GPU queries: allocated per context, read only when available, disjoint rejection, CPU-only label, deleted on dispose. `dist` uses `./` URLs. `npm ci`; `npm test` 6/6; `npm run build` passes (541.10 kB, existing >500 kB warning). |

Performance (Edge 155, RTX A4500/ANGLE D3D11, GUI hidden, drift on, idle, fresh navigation, 10 s warmup + 60 s, run sequentially):

| Run (viewport / buffer) | Frames | Triangles | Frame median / p95 ms | GPU median / p95 ms | CPU submit median / p95 ms |
| --- | ---: | ---: | --- | --- | --- |
| M1 base `6af1797`, 1440×900 / 1440×900 | 3,600 | 8 | 16.7 / 16.8 | not in M1 | not in M1 |
| M2 reference, 1440×900 | 3,600 | 131,078 | 16.7 / 16.8 | 2.950 / 5.158 | 0.1 / 0.2 |
| M2 reduced, 1440×900 | 3,600 | 32,774 | 16.7 / 16.8 | 1.777 / 3.483 | 0.1 / 0.2 |
| M2 reference stress, 2560×1440@2 / 5120×2880 | 3,586 | 131,078 | 16.7 / 16.8 | 2.776 / 4.449 | 0.1 / 0.2 |
| M2 reduced stress, 2560×1440@2 / 5120×2880 | 3,600 | 32,774 | 16.7 / 16.8 | 2.780 / 4.886 | 0.1 / 0.2 |
| M2 reference after 3 context restores, 1440×900 | 3,600 | 131,078 | 16.7 / 16.8 | 1.123 / 4.189 | 0.1 / 0.2 |

Interpretation: the gating frame metric shows 0% change (no >10% median or p95 trigger), matching the builder's result. GPU elapsed time is real but not stable here: my reference median is 2.95 ms versus the builder's 0.227 ms, and an 11× pixel increase did not change it, so this ANGLE/D3D11 desktop timer is dominated by non-pixel overhead and run-to-run state. It cannot rank the presets or stand in for phone cost. The builder documents this limitation and keeps both sweeps, which is honest. The 3,599 GPU samples after three context restores show that the query pool really is recreated. For M2 this is enough cost/fidelity evidence: triangle counts are bounded, a reduced preset exists, the fidelity loss is shown, and the preset choice stays open until phone measurements arrive (nit 1).

Environment: Windows 11, Edge 155.0.4283.45 isolated profile on CDP :9334 (occlusion/backgrounding disabled), my checkout on `http://127.0.0.1:5175/` (`npm run dev -- --host 127.0.0.1 --port 5175 --strictPort`); M1 base exported with `git archive` and served on :5176 for the matched run. Shader console: no compile errors or warnings in any run.

Reviewer evidence (scripts, captures, JSON): `C:/Users/Adam Tate/orca/review-evidence/M2-claude-r1/` (`claude-checks.json`, `*-timing.json`, `warnings-*.json`, PNGs). Builder evidence in `docs/evidence/M2` was read and is consistent; its `checks.json` filters only console *errors*, which is why nit 5 was not visible there.

## Manual verification

1. Open `/` then `/?debug`: no GUI, then the M2 GUI. Resize to 390×844, 844×390, 3840×720: lip/pool visible, no wall edge, DPR ≤ 2.
2. Curtain opacity 0, drift off: toggle `displacement` (rock flattens, `normals` view goes uniform) and `sheen` (wet glints vanish, dry rock stays). Switch quality reference/reduced repeatedly: geometries stay 2.
3. View `wet mask`, trickleSpeed 0.05: stripes drift slowly downward inside the curtain band.
4. View `light mask`, move light x/targetY: mask and rock glints move together and fade before the pool.
5. Lose/restore context three times and edit a source file for HMR: one canvas/GUI, stable geometries/programs, rendering resumes.
6. Phone (due M4, not claimed): on a named iPhone/Safari and Android/Chrome, check orientation framing, no scroll/zoom, and record the reference vs reduced frame time.

## Gaps and next gate

Untested: physical-phone GPU cost, mobile precision/thermal behaviour, preset choice for phones (pending tester confirmation, due before M4). Expected future: curtain shading, touch field, particles, shaft volume, pool, post. Approval applies only to `0354151a78de0eaa228d58591d3618aa43358c51` and M2 scope; M3 may start, and the nits above must be dispositioned at their stated gates. The prior checkpoint-template nit remains due before the first M3 checkpoint.
