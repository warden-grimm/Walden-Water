# M4 checkpoint review — revision 2

- Mode: CHECKPOINT (focused recheck of r1 fixes, before water deformation)
- Base SHA: `a4b55164809c009fbb12b7d10929150ebc3ce3b0` (accepted M3)
- Reviewed head SHA: `69e3852e044e60a220c7a6c3c72b1f53534b2632` (verified with `git rev-parse HEAD`). Prior checkpoint head: `458f0bd87b5d32efaa71788b275480e9d1cda748`.
- Review workspace: `claude-m4-fix-review`, `C:/Users/Adam Tate/orca/workspaces/Walden-Water/claude-m4-fix-review`
- Reviewer: Claude
- Verdict: **DRAFT FEEDBACK**
- Advancement: **not approved by checkpoint**

**Blocker 1 is resolved. Coupling may proceed within M4.** In `458f0bd..HEAD`, application code changed only in `69e3852`. `1761024` and `78126ca` only archive reports and evidence. Velocity now comes from event timestamps, is carried across faster display frames, and expires at 50 ms. I adapted the r1 probe to use controlled millisecond timestamps. With it, strength is identical at 60, 120 and 144 Hz rendering, and the new tests fail against the r1 tracker. Fixes for the other r1 findings hold, apart from the recovery gap described below. M4 advancement still requires a full exact-head review and physical-phone evidence.

## Blocking findings

None.

## Non-blocking findings

- **A successful retry does not turn touch back on** (`src/interaction/TouchField.js:97`, `:73`). After a validation failure, `catch` overwrites the user setting `touch.enabled=false`. A later context restore, or a size or format change, then validates successfully (`available: true`, RGBA16F) but leaves touch off. **Repro:** `lifefix.mjs`, in both the startup-failure and restore-only-failure scenarios. After a healthy restore, pressing produces count 0 and field 0. Only an explicit re-enable gives count 1. The lil-gui checkbox also goes stale, and the overlay can be switched on while touch is unavailable. **Impact:** a transient failure, for example during a phone restore, silently disables touch until reload. **Fix:** track the failure separately from the user's preference. Restore `enabled`/`overlay` after a successful automatic retry, and refresh the GUI. Owner: builder. Due: M4 final.
- **Velocity uses only a single event interval** (`PointerTracker.js:47`, `:87-90`). This makes it sensitive to timestamp jitter. With 60 Hz input, 144 Hz rendering and 100 px/s, timestamp jitter of ±1, ±2 and ±4 ms spreads strength over 0.015, 0.031 and 0.073 respectively. If event time ran ahead of the rAF clock (a probe with +200 ms skew), the boost would never expire while the finger is held still. The spec puts both clocks on one timeline, so check this on phones. **Fix:** smooth over 2–3 samples or set a floor on the interval, and expire after a frame count if `timestamp - eventTime < 0`. Owner: builder. Due: M4 final phone run.
- Items carried over from r1: cost attribution, and the bound/projection of the displaced contact centre. Owner: builder. Due: M4 final.

## Evidence and rubric

| Check | Result | Evidence |
| --- | --- | --- |
| 1 Event-time velocity | PASS | `velocity2.mjs`: curtain bowed, input at 60/125 Hz, rendering at 60/120/144 Hz. At 50 and 100 px/s, strength spread is ≤0.0006 (0.893 and 0.935); at 1000 px/s it is a steady 1.0. Drift ×3 gives the same values. A finger held still under drift ×6 stays at 0.85 over 288 frames. The boost lasts until 48.6 ms, and strength is 0.85 from 55.6 ms. The segment end equals the current-camera projection of the latest event (error 0), so there is no prediction. The new tests fail on r1 code (saturation assert; re-press TypeError; see `oldtracker-adapter.md`). |
| 2 Pointer lifecycle | PASS | Same-frame mouse and pen re-press stays held with one capture. A second finger keeps the first finger's sweep (Δu 0.051). Up, cancel, blur, hidden and lostpointercapture all end with 0 pointers and 0 captures. Re-entry gives a zero-length sweep at hold strength. |
| 3 Byte decay / lip | PASS | `gpufix.mjs`: all 14 cases clear in both formats, including the four r1 stall cases and 480 Hz defaults. Byte and float take 1.25 vs 1.30 s at 60 Hz. The byte trajectory stays within about 3% of float at 0.25, 0.5 and 1 s. The lip bound `2d/(s+v0)` equals the fall time. Under extreme flow (with and without gravity) the centroid moves only downward. Behaviour at default settings is unchanged. |
| 4 Failure/restore | PASS with nit | Startup failure, restore failure, and both together: water keeps animating (about 19 frames per 300 ms), no notice appears, the neutral texture reads 0, and one warning is logged. Renderer target and autoClear are restored. Textures 1→1 after 5 failed retries, and 0 after dispose. With `EXT_color_buffer_float` hidden, the half-float-only extension still validates RGBA16F; with both hidden, the byte path is used. Retry recovery: see the first non-blocking finding. |
| 5 Build/hot path | PASS | `npm ci`: 0 vulnerabilities, no new dependencies. `npm test`: 15/15. `npm run build`: passes, 568.96 kB (existing warning). Tracker and field `update` contain no allocations or readbacks; reads happen only in validation and `inspect`. |
| Visual intent | N/A | Not coupled yet. |
| Performance | UNVERIFIED (not repeated) | The r1 sweep is still the reference. Full M4 cost is due after coupling. |

Environment: Windows 11; Edge 155.0.4283.45 (ANGLE, NVIDIA RTX A4500, D3D11); 1440×900 viewport at DPR 1. My checkout was served at `127.0.0.1:5175` (strict port), using a hidden isolated profile on CDP 9334. Both were stopped afterwards. Node probes ran with a 1000×1000 surface. Probes and logs are in `C:/Users/Adam Tate/AppData/Local/Temp/claude/C--Users-Adam-Tate-orca-workspaces-Walden-Water-claude-m4-fix-review/8b6b7247-71ff-4861-9c41-f2fe105baf6b/scratchpad/`: `probes/{velocity2,gpufix,lifefix,cdp}.mjs`, `probes/oldtracker-adapter.md`, `out/{velocity2,gpufix,lifefix}.json`, `out/*.png`, `out/{npmci,test,build}.txt`.

## Manual verification

1. On a 120 Hz phone, with `?debug` and the overlay on, swipe slowly and then stop while still holding. Width and strength should stay steady during the swipe and fall back to the hold value within about 50 ms.
2. Swipe one finger and, mid-sweep, add a second. Then lift, cancel and background the app. Neither trail is erased, and no obstacle remains.
3. Force byte mode at the highest refresh rate available. After release, the field reads neutral (`inspectTouch()` max, minX and maxX all 0) within about the recovery time.
4. Corrupt validation, then restore the context: the water keeps animating and one warning is logged. Remove the corruption and restore again. Touch should return; at this head it needs an explicit re-enable.
5. **Phone (final M4 gate):** a real two-finger run and a slow-motion latency check, recording the tester, model, OS and browser.

## Gaps and next gate

UNVERIFIED: real multi-touch, phone latency, event-timestamp behaviour on iOS and Android, phone GPU cost, and fallback selection on phones. The iPhone 15 Pro Max report covers M3 rendering only. M4 final requires the coupled parting and foam, current-head cost, the phone evidence, and a full exact-head review. This checkpoint approves nothing.
