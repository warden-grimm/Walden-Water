# M8 review — revision 1

- Mode: MILESTONE (M8, post-processing and polish, plus the user-requested Save/Reset settings)
- Base SHA: `99d04e116e76b8eef4ebd47bebb9d3dd191310f1`
- Reviewed head SHA: `4afa5a6adb15dd2e099e54caeef502c734c9bbee` (`git rev-parse HEAD` matches)
- Review workspace: `C:/Users/Adam Tate/AppData/Local/Temp/claude/C--Users-Adam-Tate-orca-projects-Walden-Water/1fc6aed2-c965-4ca1-8082-7ab44555a6a5/scratchpad/m5-review`
- Reviewer: Claude
- Verdict: CHANGES REQUESTED
- Advancement: blocked

## Blocking findings

1. **`src/main.js:16`: an HMR makes Save drop earlier settings and stops Reset from restoring defaults.**
   - **Problem.** `defaults = structuredClone(config)` runs again every time `main.js` hot-reloads (`main.js:183`). `config.js` is not re-evaluated, so the "defaults" captured then already include any saved values and GUI edits.
   - **Consequence.**
     - The next Save stores a diff against the wrong baseline. It silently drops the earlier saved values from `localStorage` and from the JSON snippet the user is meant to send for baking in.
     - Reset reports success but leaves those values applied.
     - This is the workflow the feature serves: the user tunes on the builder's dev server while the builder's edits cause HMR.
   - **Reproduction** (`review-scratch/m8/hmr-settings.mjs`, :5176):
     1. Reset, then set `shaft.intensity` to 0.2 and Save. Storage holds `{"shaft":{"intensity":0.2}}`.
     2. Rewrite `src/main.js` with identical bytes to trigger HMR.
     3. Set `pool.reflectivity` to 1.4 and Save. Storage now holds only `{"pool":{"reflectivity":1.4}}`.
     4. Reset: storage is `null`, but `shaft.intensity` is still 0.2.
   - **Minimal fix.** Capture the shipped defaults once, where HMR of `main.js` cannot recapture them. For example, export a frozen clone from `config.js` at module evaluation, or keep it in `import.meta.hot.data`.
   - **Retest.** The script above, plus a unit or browser check that save → HMR → save keeps both keys and that Reset then restores 0.0225.

## Non-blocking findings

- **`src/scene/PostProcessing.js:75-77` and `docs/scene-contract.md:499`: bloom runs at a quarter of the buffer resolution, not half.** `UnrealBloomPass` halves the resolution it is given again internally (r186 `UnrealBloomPass.js:101,252`). So `bloomResolution` 0.5 gives a 195×422 bright pass for a 780×1688 buffer. The look was approved as shipped, so either pass the full buffer size or correct the docs, `bloomSize` and the M9 cost notes. Owner: builder; due M9.
- **`src/adaptiveResolution.js:18`: backoff never decays.** After one failed upgrade episode, every later recovery waits up to ×8 (64 s per step) for the rest of the session. Consider resetting backoff after an upgrade has held for `recover` × backoff seconds. Owner: builder; due M9 (phone presets).
- **Adaptive level changes call the full `resize()`.** This cancels a running debug sample and reconfigures all targets even when the ratio cannot change (devices at DPR 1). It is harmless now; skipping `resize()` when the effective pixel ratio is unchanged would be cleaner. Owner: builder; due M9.

## Evidence and rubric

| Category/check | Result | Command, observation, artifact, or reason |
| --- | --- | --- |
| Scope/spec | FAIL (blocker 1) | The diff covers `PostProcessing.js`, `composite.frag.glsl`, `adaptiveResolution.js`, `settings.js`, the panel, `main.js`, config, tests and docs. There is no unrelated refactor. Optional audio/haptics are omitted, as allowed. Save/Reset (in scope) fails after HMR. |
| Toggles: each pass, then all | PASS | `review-scratch/m8/probe.mjs` (copy of `probe.mjs` on :5176). Portrait 390×844 DPR2 and landscape 844×390 DPR2. Draws are 28 with post on, 15 with bloom off, 14 with all off or zero effects (no target allocated). Geometries/textures/programs stay at 13/18/22 throughout. 0 console warnings/errors. |
| Display-space / no double tone mapping | PASS | Checked against three 0.186.1 source. `isXRRenderTarget` is read only in `WebGLPrograms.js:181,213`, `WebGLRenderer.js:2378,2391`, `UniformsUtils.js:140` (tone mapping/output colour space, as for the canvas) and `WebGLTextures.js:2120` (MSAA renderbuffer format, linear transfer only). The builder's claim holds. The bloom blend (`CopyShader`) and the composite include no tonemapping/colorspace chunks, so the image is tone mapped once. Captures: zero effects matches all off (mean 47.61 vs 47.86). |
| Glints without washed-out shadows | PASS | Portrait luminance: p10 is 2.7 with defaults vs 3.0 with all off. p99 is 182 vs 174. 0.19% of pixels are ≥250, and only with bloom on (`out-m8/crop-portrait.png`). |
| Adaptive overload/recovery | PASS | Portrait trace with `simulateLoad` 40 → 0 → 18. Steps 2→1.5 at 5 s and →1 at 9.5 s; back to 1.5 at 8.5 s and to 2 at 18.5 s. Backoff grows 1→2→4 with retry gaps of 10 s and 17.5 s, and no oscillation. Canvas, post target and capture agree with the ratio at every 0.5 s sample (`adaptive-size-consistency: true`). |
| Pointer mapping across levels | PASS | The same CSS point maps to UV (0.5, 0.5668) at ratios 2, 1 and 2. |
| Shader/field and fallback | PASS | With `EXT_color_buffer_float` hidden before load (`nofloat.mjs`): post is off (logged once), 14 draws, touch uses RGBA8 packed16, the pool uses RGBA8, a swipe splashes 9 bursts, and this survives a context restore. |
| Mobile/lifecycle | PASS / phone UNVERIFIED | With post on, context loss and restore rebuild the target and bloom at matching sizes. While hidden: `running:false`, ≤2 frames. `hmr.mjs`: 20 cycles (auto and byte; main, createScene, Particles, Pool, PostProcessing), 1 canvas, 1 GUI, splashes, 0 warnings. `hmr-restore.mjs`: 0 warnings, the page reloads. |
| Performance | PASS (desktop) | Matched runs: 1440×900 DPR1, 10 s warmup + 60 s, 60 Hz, M7 on :5177. Frame median/p95 are 16.7/16.8 in all pairs. GPU median/p95 (ms), M7 → M8: idle 4.80/6.40 → 4.93/7.67; stress 4.67/6.67 → 4.46/7.02; interaction 5.12/7.18 → 4.67/6.23. The GPU p95 change ranges from −13% to +20%, inside run-to-run noise, matching the builder's disposition. Hot paths: `record()` uses fixed typed arrays, and there are no allocations in `post.render`. Two idle runs were cancelled by external window resize events on the shared Edge (adaptive stayed at level 0); the rerun was clean. |
| Visual intent | PASS (desktop) | Same look as M7: glints glow softly, corners are darker, grain is faint. The beam stays the focal point, with no seam (`out-m8/landscape/post-default.png`). |
| Maintainability/deployment | PASS with nits | Tunables carry GUI ranges. Save validation is sound: no non-primitive config values exist, and every numeric key outside `diagnostics` has a range. The commented shader is standalone. `npm run build` passes (existing chunk-size warning). |

Commands: `npm ci` (0 vulnerabilities), `npm run build` (pass), `npm test` (33/33). Preview: `npm run dev -- --host 127.0.0.1 --port 5176 --strictPort`; the M7 baseline (`git archive 99d04e1`) was served on 5177. I stopped both. Saved settings were reset after every Save test (`localStorage` null on :5176).

Environment: Windows 11, isolated Edge via CDP :9333, desktop GPU, touch emulation, viewports as above. This is not phone evidence.

## Manual verification

1. Open `?debug`. Switch bloom, vignette and grain off one at a time, then `post.enabled` off. Each change affects only its own effect, and all off matches M7.
2. Set adaptive → `simulateLoad` 40. Within about 10 s the image steps to 1.5× and then 1×. Set it to 0 and it returns to 2× within about 20 s. Touches still land under the finger.
3. Set `shaft.intensity` to 0.2 and Save. Trigger an HMR (save any `src/main.js` edit). Change `pool.reflectivity` and Save again. **Expected after the fix:** the snippet and storage contain both values, and Reset restores 0.0225.
4. Force a context loss and restore, then switch tabs and come back. The page renders, resumes without a jump, and logs no warnings.
5. **Phone (portrait and landscape):** bloom/grain look, smoothness, whether adaptive drops resolution, and touch alignment after a drop. UNVERIFIED.

## Gaps and next gate

- Phone performance, the adaptive behaviour on a real GPU, and the look on device are UNVERIFIED (M9).
- Re-review requires the fix for blocker 1 with its retest. Everything else in this report is accepted as reviewed at `4afa5a6`.
- The approval will apply only to the resubmitted head.
