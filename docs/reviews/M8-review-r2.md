# M8 review — revision 2

- Mode: MILESTONE (M8, post-processing and polish, plus the user-requested Save/Reset settings; focused r1 retest)
- Base SHA: `99d04e116e76b8eef4ebd47bebb9d3dd191310f1`
- Reviewed head SHA: `11eea4be20de18fbb37c84cf8d6bd224dbad8f25` (`git rev-parse HEAD` matches; r1 head `4afa5a6`)
- Review workspace: `C:/Users/Adam Tate/AppData/Local/Temp/claude/C--Users-Adam-Tate-orca-projects-Walden-Water/1fc6aed2-c965-4ca1-8082-7ab44555a6a5/scratchpad/m5-review`
- Reviewer: Claude
- Verdict: APPROVE
- Advancement: permitted

## Blocking findings

None.

r1 blocker 1 (HMR re-captured the defaults) is **resolved**. `config.js` now exports `defaults`, cloned once when the module first evaluates, and `main.js` imports it.

| Retest | Result |
| --- | --- |
| Builder's `hmr-settings.mjs` on :5176 | `pass: true` |
| My r1 reproduction | After save → HMR → save, storage holds `{"shaft":{"intensity":0.2},"pool":{"reflectivity":1.4}}`. Reset clears storage and restores 0.0225 / 1.8. |

## Non-blocking findings

None new. All three r1 nits are closed:

- **Bloom size.** The pass is now given 2× the intended size, so its first level is `bloomResolution` × the buffer. The default changed to 0.25, which is what r1 actually ran at.
  - `bloomSize` is [195, 422] for a 780×1688 buffer and [300, 200] for 1200×800.
  - Portrait luminance with defaults is unchanged from r1: p99 180 vs 182, and 0.16% vs 0.19% of pixels saturated (`out-m8r2/r1-vs-r2-crop.png`).
- **Backoff.** It resets once an upgrade holds for `recover` s. There is a new unit test, and the browser trace confirms it (below).
- **No-op level changes.** A level change that leaves the ratio unchanged no longer calls `resize()`.

M9 phone items carry forward unchanged.

## Evidence and rubric

| Category/check | Result | Command, observation, artifact, or reason |
| --- | --- | --- |
| Scope/spec | PASS | The diff `4afa5a6..11eea4b` touches config, main, panel, PostProcessing, composite, adaptiveResolution, one test, docs and evidence. **Grain removal** was requested by the user and is documented in `scene-contract.md:510`. No `grain` reference remains in `src`/`tests` (the only match is an unrelated shaft-shader comment). The composite no longer includes the noise chunk or a time uniform. |
| Legacy saved settings | PASS | `review-scratch/m8r2/legacy.mjs` stored `{post:{grain:true,grainAmount:0.1,grainRate:24,vignette:false},shaft:{intensity:0.05}}`. The normal page rendered with 0 errors. The debug page applied 2 values (vignette off, intensity 0.05) and has no `grain` key. Re-saving writes a clean diff without grain keys. |
| Save/Reset | PASS | A real mouse click on Save stored the diff, copied it and showed the snippet ("Copied to the clipboard"). A scripted Save skips the copy (user-activation gate). Reset clears storage, closes the snippet and restores defaults. The probe's normal-page round trip passes in portrait and landscape. |
| Post toggles | PASS | `review-scratch/m8r2/probe.mjs` (builder's script on :5176) at 390×844 and 844×390, DPR2. Draws: 28 with defaults, 15 with bloom off, 28 with vignette off, 14 with all off or zero effects (no target). Resource counts are 13/18/22 throughout. The tone-mapping path is unchanged since r1. |
| Adaptive overload/recovery | PASS | Portrait trace: 2→1.5 at 5 s, →1 at 9.5 s; back to 1.5 at 9 s and to 2 at 19 s. Under the resolution-dependent load, retry gaps grow and backoff goes 1→2→4→8. Sizes agree at every sample. Touch UV is (0.5, 0.5668) at ratios 2, 1 and 2. |
| Backoff reset | PASS | `m8r2/backoff.mjs`: backoff reaches 4 under load 18. With the load removed, the upgrade to 2 at t 33 s holds and backoff drops to 1 at t 41 s (8 s later). `npm test` includes "an upgrade that holds forgets earlier failures". |
| No-op resize at DPR 1 | PASS | At 1200×800 DPR1 with load 40, the scale steps 2→1.5→1 while the buffer stays 1200×800. A debug sample started beforehand is still `sampling` (not cancelled). |
| Mobile/lifecycle | PASS / phone UNVERIFIED | Context restore with post on rebuilds the target and bloom at matching sizes. While hidden: `running:false`, ≤2 frames. HMR: 20 cycles (auto and byte, five modules), all with touch, post, 1 canvas, 1 GUI and splashes, 0 warnings. HMR after a restore: 0 warnings, the page reloads. No-float fallback: renders directly, byte touch, 9 splashes before and after a restore. |
| Performance | PASS (carried from r1) | Bloom cost is unchanged (same effective size) and grain removal only removes ALU from the composite, so the r1 matched runs stand: frame 16.7/16.8 ms in all pairs vs M7. No hot-path allocation was added: the `pixelRatio()` comparison and the backoff check are scalar. |
| Visual intent | PASS (desktop) | Same look as r1 without grain. Blacks hold (p10 2.7–3.0 across toggles). The beam remains the focal point. |
| Maintainability | PASS | Defaults are a single source in `config.js`, and the comments explain the HMR reason. `npm run build` passes (existing chunk-size warning). `npm test` 34/34. |
| Console | PASS | 0 warnings/errors in every run. The only Three warning, in the no-float run, comes from my extension masking. |

Commands: `npm run build` and `npm test` (34/34). Dependencies are unchanged since the r1 `npm ci`. Preview: `npm run dev -- --host 127.0.0.1 --port 5176 --strictPort`, stopped afterwards. Each save test ended with `resetSettings()`, and `localStorage` is null on :5176.

Environment: Windows 11, isolated Edge via CDP :9333, desktop GPU, touch emulation, display around 57–60 Hz. This is not phone evidence.

## Manual verification

1. `?debug`: turn bloom off, then vignette off, then `post.enabled` off. Each changes only its own effect, there is no grain or flicker at any setting, and all off matches M7.
2. Set a value and Save; trigger an HMR; set another value and Save. The snippet lists both, and Reset restores the defaults.
3. Set adaptive `simulateLoad` 40, then 0. The image steps down and back up to 2×, and touches stay under the finger.
4. Force a context loss and restore, then switch tabs and back. The page renders and resumes, with no console warnings.
5. **Phone (portrait and landscape):** bloom look, absence of stripes, smoothness, adaptive drops and touch alignment. UNVERIFIED (M9).

## Gaps and next gate

- Phone performance, the adaptive behaviour on a real GPU and the on-device look remain UNVERIFIED and are owned by M9.
- Optional audio/haptics are not included.
- M8 approval applies only to `11eea4be20de18fbb37c84cf8d6bd224dbad8f25`. M9 may start from this head.
