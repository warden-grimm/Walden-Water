# M1 review — revision 1

- Mode: MILESTONE (M1 — scaffold and lifecycle)
- Base SHA: `e03aed336d31985206bfb9be0ea88525cead4d64`
- Reviewed head SHA: `6af1797edb83f5677eb46ff49b92b713181e0240` (`git rev-parse HEAD` verified before review)
- Review workspace: Orca `claude-m1-review`, `C:/Users/Adam Tate/orca/workspaces/Walden-Water/claude-m1-review`
- Reviewer: Claude
- Verdict: **APPROVE WITH NITS**
- Advancement: **permitted** to M2 for this exact head, with the nits below tracked

## Blocking findings

None.

## Non-blocking findings

1. **Baseline cannot detect cost growth below refresh saturation.** The builder's baseline (median 17.5 ms, p95 18.1 ms) and mine (17.6 / 18.2 ms, max 18.9 ms, 0 frames >25 ms) both match the ~57 Hz display interval. They show vsync pacing, not render cost. A future M2/M3 cost increase could therefore stay under the >10% trigger until frames are already being dropped. Fix: when real geometry arrives, add a debug-only GPU timer query (`EXT_disjoint_timer_query_webgl2`, with fallback to CPU submit time) or a documented stress setting to `snapshot()`/sample output. Keep the frame interval as the gating metric. Owner: builder. Due: M2.
2. **Physical-device gaps.** Phone pinch/scroll suppression (iOS Safari `touch-action`/`gesture*`) and mobile app backgrounding are untested on hardware. Desktop and emulated behavior pass (see below), and M1 permits explicit physical gaps. Owner: coordinator (arrange tester). Due: before M4 (fold into the required real multi-touch run).
3. **The wall does not follow the framing.** `src/config.js:9` fixes the wall at 20 m wide. Measured at the default camera, its edges are at NDC ±1.10 at 2560×1080 and would enter the frame above an aspect ratio of about 2.6 (e.g. 32:9). Required viewports are unaffected. Fix: derive the minimum wall size from `cameraDistance` when the M2 rock plane replaces this placeholder. Owner: builder. Due: M2.

## Evidence and rubric

| Category/check | Result | Command, observation, artifact, or reason |
| --- | --- | --- |
| Scope/spec | PASS | Diff replaces the orbit demo with wall + translucent curtain + lip/pool markers, `config.js`, `time.js`, lazy GUI, and lifecycle. There is no future-milestone work. The only new dependency is the allowed `lil-gui@0.21.0`. The markers are a disclosed, justified review aid. |
| Shader/field | N/A (M3/M4) | No shaders or field yet. |
| Interaction | PASS (M1 subset) | There are no pointer handlers. In Edge, a trusted CDP drag plus a 500 px wheel left the camera on its drift path only; under reduced motion it stayed exactly at `[0,3,9.388]` after the drag. Touch-field checks are N/A until M4. |
| Mobile/lifecycle: GUI | PASS | Ordinary URL: 0 `.lil-gui`, `__WALDEN_DEBUG__` undefined. `?debug` shows only the renderer/camera/wall/curtain/markers/timing/diagnostics folders. Setting curtain opacity through the GUI input updated config; drift on/off, `driftX`, and `maxDpr` all took effect. |
| Mobile/lifecycle: framing | PASS (emulated) | Measured at 390×844, 844×390, 1440×900, and 2560×1080: both markers are inside NDC ±0.84 during drift. Scroll size equals the viewport. A synthesized touch pinch kept `visualViewport.scale` at 1 and a scroll gesture left `scrollY` at 0. Ctrl+wheel on the canvas is `defaultPrevented`. The curtain fills about 73% (portrait) and 85% (landscape) of the height. |
| Mobile/lifecycle: DPR | PASS | At emulated DPR 3: 390×844 gives a 780×1688 buffer and 844×390 gives 1688×780 (DPR 2). With `maxDpr` at 1.5 the buffer is 585×1266. Buffers follow every resize. |
| Mobile/lifecycle: visibility | PASS (native desktop) | Tested natively in a separate Edge 155 (temp profile). **Tab switch:** hidden about 4 s; `running=false`; frames frozen at 253; first resumed frame elapsed delta 0 (4.4676 → 4.4676). **OS window minimize:** hidden about 3 s; frames frozen at 1177; first resumed frame delta 0. The `maxDelta` clamp (`src/time.js:10`) also bounds any missed pause to 50 ms. This supersedes the builder's controlled-getter limitation for desktop. Phone backgrounding is still unverified (nit 2). |
| Mobile/lifecycle: context | PASS | 3× `loseContext`/`restoreContext`: rendering stops, notice is shown, frames hold. After each restore: running, notice hidden, frames advance, and the counts are 1 geometry, 2 programs, 0 textures, 4 draws, 8 triangles. `restores` reaches 3. |
| Mobile/lifecycle: HMR | PASS | 6 hot updates (`main.js` ×3, `createScene.js`, `config.js`, `panel.js`) triggered by mtime-only touches with no content change; `git status` stays clean. There was no full reload: a page marker survived. Results after each update: 1 canvas, 1 WebGL context created, 1 GUI root, and about 57 rAF/s, equal to app frames/s (one loop). Per-target listener counts are identical after every cycle (e.g. canvas `webglcontextlost` 2 = app + Three, `resize` 1, `visibilitychange` 1, each MQL 1). There were no errors. |
| Performance | PASS (desktop baseline) | Hot path (`main.js:45-51`, `createScene.js:17-29`) has no allocations. There are 4 draws and 8 triangles (placeholders). Recomputing the builder's `baseline.json` gives 3,412 frames, median 17.5, p95 18.1. My independent run (1440×900, DPR 1, drift on) gives 3,395 frames, median 17.6, p95 18.2. Not phone certification; see nit 1. |
| Visual intent | PASS (placeholder) | The scene is dark (`#070b10`/`#17232c`) with a subdued teal curtain at 0.28 opacity, and the wall is behind it at every tested size. Builder PNGs match my captures. The WebM is 16.8 s at 1440×900. `motion-checks.json` records drift until reduced motion turns on, then a fixed camera. The shaft and materials are expected gaps. |
| Maintainability/deployment | PASS | Tunables and ranges are centralized in `config.js`. The single timeline/uniform is passed into the scene. `dispose()` owns all listeners/GPU objects. `npm ci` reports 0 vulnerabilities and `npm test` passes 3/3. `npm run build` passes with the known 530 kB chunk warning. `dist/index.html` uses `./assets/…` and `./favicon.svg`, and the panel loads via `./panel-*.js`. Nothing was published. |

Environment: Windows 11, NVIDIA RTX A4500 workstation, Microsoft Edge 155.0.4283.45 (separate instance, CDP :9333, native occlusion disabled so that a tab switch or minimize is the only hide signal), and Chrome 155 for the GUI smoke test. Preview: `npm run dev -- --host 127.0.0.1 --port 5175 --strictPort` from this checkout, at `http://127.0.0.1:5175/` and `http://127.0.0.1:5175/?debug`. I used no other server for review.

## Manual verification

1. Open `/` and confirm there is no GUI. Open `/?debug` and confirm only implemented folders appear. Change curtain opacity, `frameFill`, and drift: the view updates and the markers stay in frame.
2. At 390×844 and 844×390 (DPR 3) and on desktop, check that the buffer is at most 2× CSS size, there is no scroll, and the lip and pool lines are visible.
3. Switch tabs or minimize for a few seconds and return: `snapshot().frames` is frozen while hidden and elapsed does not jump.
4. Run Lose/Restore context three times: the notice appears and clears, and the counts are stable.
5. **Phone (pending, before M4):** on a real iPhone/Safari and Android/Chrome, pinch and drag on the canvas: no zoom, scroll, or camera change. Background the browser and resume: no time jump.

## Gaps and next gate

Unverified: physical-phone pinch/scroll and app backgrounding, and mobile GPU timing. These are non-critical at M1 and tracked in nit 2. Expected future gaps are rock and water shaders, touch field, particles, shaft, pool, and post-processing. Advancement to M2 is permitted for head `6af1797` only. Nits 1 and 3 are due in the M2 submission, and nit 2 is due before M4. The prior coordinator nit (CHECKPOINT template) remains due before M3.
