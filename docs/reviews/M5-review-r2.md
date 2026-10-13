# M5 review — revision 2

- Mode: MILESTONE (focused re-review of r1 fixes plus regressions)
- Base SHA: `86f9fd594e98719b8b0f059e4267c0c29cdad09a`
- Previously reviewed head: `f412dac527fe2827de2fb401e20daf1ad1144044` (r1: CHANGES REQUESTED, one blocker)
- Reviewed head SHA: `e2ed56dc0d19a977454fa725e180f4a68e31c8b0` (`git rev-parse HEAD` verified)
- Review workspace: `scratchpad/m5-review` (detached at HEAD); preview `http://127.0.0.1:5176/` with `--strictPort`
- Reviewer: Claude
- Verdict: **APPROVE WITH NITS**
- Advancement: permitted for M6 once the coordinator records this outcome. Physical-phone particle checks remain UNVERIFIED and stay with the owned items below.

## Blocking findings

None. r1 blocker 1 (HMR disabled touch) is resolved. See the evidence below.

## Non-blocking findings

- **Pre-existing: stale-disposal warnings after HMR that follows a forced context restore.** After two restores followed by one HMR, the console shows `INVALID_OPERATION: delete/deleteVertexArray: object does not belong to this context` warnings (about 70). Touch, bursts and counts stay correct. This is the already-owned item, not new to M5 in kind, though M5 adds more objects to dispose. Owner: builder. Due: M8 (unchanged).
- **Burst count depends on swipe speed in an unexpected direction.** Medium drags (about 0.7–1.2 m/s on the curtain) now release a burst per 0.1 m of travel. A slow 80 px drag over 1.25 s gives 7 bursts in portrait and 12 in landscape. A fast 80 px flick over 0.17 s is interval-limited to 3–4 bursts, although each fast burst carries more and stronger droplets. Not a defect of the fix, but worth judging on the phone so that fast swipes still read as the more violent gesture. Owner: builder. Due: M5 phone feedback / M9 presets.
- **Deferred r1 nits keep their owners:**
  - 10-finger ring saturation: builder, M9.
  - Shader distribution constants: builder, M9.
  - Mote attenuation behind the curtain and mist edge spill: builder, M6.
- **Trivial:** `tests/particles.test.js:62` has mis-indented loop opening. Owner: builder. Due: next touch of the file.

## Evidence and rubric

| Category/check | Result | Command, observation, artifact |
| --- | --- | --- |
| Scope/spec | PASS | The fix delta covers only the HMR, jitter-deadband and lip-retirement nits, plus their tests and contract text: `main.js` +4, `SplashEmitter.js` +8/−2, `spray.vert.glsl`, one config key with its range, and tests. No unrelated changes. |
| HMR blocker fix | PASS | **Mechanism:** `renderer.resetState()` after construction and before disposal. **`hmr2.mjs`** (mtime-touch on `main.js`, `createScene.js`, `Particles.js`, then `main.js` again): touch available after every cycle; 1 canvas, 7 geometries, 4 textures, 7 programs, 7 draws; no warnings. **`hmr3.mjs`** (each particle system alone, and all together): validation passes. **`hmr4.mjs`:** `BLEND` is disabled at the probe readbacks, and the probe bytes are exact (32,64 / 127,127 / 223,191 / neutral 127,0). **`r2-hmr-byte.mjs`:** forced-byte HMR on `main.js`/`Particles.js` stays packed16, and swipes give 9 bursts each. |
| Context loss/restore with resetState | PASS | Two restores, swipe after each: touch RGBA16F, bursts resume (+9 each), counts unchanged. The lifecycle rerun also passes: GUI rebuilds of slots/perBurst/count/capacity/mistCount, bursts disabled → 0, touch disabled → 0, byte → 9, hidden page clears contacts, no console warnings or errors. |
| Jitter deadband | PASS (emulation) | `jitter.mjs` holds a finger for 3 s with ±0/1/2/3/4 CSS px random jitter at 390×844 and 844×390 DPR2. Every case gives exactly 1 burst (the press). In r1 the same probe gave 15–40. Lifecycle ±2 px hold: 1. |
| Swipes still splash | PASS | The r1 direction probe gives identical results to r1: 7 bursts per swipe in all four directions and both orientations. Mirrored burst-brightness centroids: portrait +88/−83 px (right/left swipes), −22/+147 px (up/down); landscape +81/−57, −58/+94. `speeds.mjs`: slow, medium, fast, flick and long swipes all splash in both orientations. |
| Lip spray pool retire | PASS | `lip.mjs` with `lipLife=3`, lip-only spray, curtain and rock blacked out. Across 6 frames there are no bright pixels more than 40 px below the pool marker, and drops visibly stop at the pool line. Shader: `min(lipLife·vary, impactTime(height,0))` plus retirement when `y<pool`. |
| Tests/build | PASS | `npm ci` OK; `npm test` 23/23; `npm run build` OK (592.89 kB, existing >500 kB chunk-size warning). |
| Performance | PASS (unchanged) | The fix adds one `hypot` per contact per frame and one shader branch. No allocations, passes or textures. The r1 matched timing still applies. |
| Visual intent / phone | UNVERIFIED (phone) | Desktop emulation only. Droplet look, cost and held-finger calm on a physical phone remain unobserved. |

Environment: Windows 11, isolated Edge 155 via CDP 9333 with touch emulation, desktop GPU. Viewports 390×844 and 844×390 at DPR2, plus 390×844 at DPR1 for the lip check. Scripts and outputs are in `review-scratch/` (`out-r2/`), untracked.

## Manual verification

1. In dev, save `src/main.js` three times. Expected: touch, parting and bursts keep working, with no console warnings.
2. Hold one finger still for 3 s. Expected: one small splash, then none. **Phone, portrait and landscape.**
3. Swipe slowly, then fast. Expected: both splash; fast throws farther and reads as more violent. **Phone.**
4. In `?debug`, set `spray.lipLife` to 3. Expected: lip drops end at the pool line and never fall below it.
5. Force context loss and restore, then swipe. Expected: bursts resume and touch stays available.

## Gaps and next gate

Physical-phone particle look, cost and held-finger behaviour are UNVERIFIED and are not inferred. The visible shaft (M6) and pool rings (M7) are expected future work. This approval applies only to `e2ed56d` and the M5 scope. Nits carry the owners and due milestones listed above.
