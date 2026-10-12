# M3 review — revision 1

- Mode: MILESTONE (M3 — Falling water curtain)
- Base SHA: `0354151a78de0eaa228d58591d3618aa43358c51`
- Reviewed head SHA: `a4b55164809c009fbb12b7d10929150ebc3ce3b0` (verified with `git rev-parse HEAD`; reviewed `git diff BASE..HEAD`, and `a06955a..HEAD` for checkpoint fixes)
- Review workspace: Orca child worktree `claude-m3-review`, `C:\Users\Adam Tate\orca\workspaces\Walden-Water\claude-m3-review` (branch `claude-m3-review`)
- Reviewer: Claude
- Verdict: APPROVE WITH NITS
- Advancement: permitted (M4 may start; M4's own phone/multi-touch/fallback gate still applies)

## Blocking findings

None.

## Non-blocking findings

- **Glints sit high in the curtain, not where the beam crosses it.** The glint energy centroid is at screen y≈175 of the 77–824 ribbon, about y≈5.2 m, while the beam axis crosses at y=4. Glint pixels stop at y≈496. The mirror point for the default source and camera lies above the lip (≈6.8 m), so `pow(N·H, 80)` peaks near the top. The glints are localized, gated by the beam, and do respond to the light: moving the source shifts the centroid (660,175)→(677,229) and changes the energy 0.55→0.98 M. Retune when the visible shaft lands. Owner: builder. Due: M6.
- **The silhouette is still fairly rectangular.** The ribbon has a straight top and fairly straight sides; `lipFade` is 0.02, about 12 cm. This is much improved from the checkpoint's milky sheet, and the sides are now soft and ragged. Lip spray should break it up. Owner: builder. Due: M5.
- Checked carryovers. These are dispositions, not new defects:
  - HMR after a forced context restore logs 45 stale-delete warnings. This is development-only, rendering resumes, and normal restores are clean, so M8 is correct.
  - Long-uptime noise precision: M9.
  - Phone cost and preset choice: M4/M9.
  - None of these is a current M3 blocker.

## Evidence and rubric

| Category/check | Result | Evidence |
| --- | --- | --- |
| Scope/spec | PASS | Diff is limited to the curtain, capture, debug and scoped M2 nits. No touch/M4 work. Wall-as-background deviation documented in `scene-contract.md`. |
| Shader/field | PASS | Flow sign/acceleration, UV↔world, target isolation and single color conversion were proven at the checkpoint, and the code paths are unchanged. Derivatives are now `/(2·step·width/height)` (`water.frag.glsl:18-19`) and Fresnel is clamped. Flow bands widen downward. My zero-offset vs wall-only diff is **0** in both auto and byte. Byte format snapshot is `SRGB8_ALPHA8`. Auto vs byte max 2/255, 5,843 vs 4,053 unique colors (reproduces the builder exactly; a double sRGB encode would differ grossly). |
| Interaction | N/A (M4) | Raycast/UV contract test passes. |
| Mobile/lifecycle | PASS | 3 context cycles (auto, auto, byte): format reselected, generation incremented, 55 frames advanced each, 3 geometries/1 texture/3 programs, **0 warnings**. Real tab hide: `document.hidden` true, frames/time frozen (859→859), resumes. Builder `checks.json`: 3 HMR cycles keep 1 canvas/1 GUI and 3/1/3 resources; 8 rebuilds stable; DPR3 emulation capped at 2. Physical phone: UNVERIFIED (M4). |
| Performance | PASS (desktop) | My matched 10 s + 60 s runs, 1440×900 DPR1, 3,600 frames each: reference frame 16.7/16.8 ms, GPU median/p95 1.854/1.922 ms; no-water frame 16.7/16.8 ms, GPU 1.283/2.128 ms. CPU submit 0.1/0.2 ms. The frame gate is not triggered against the builder's M2 baseline of 16.7/16.8 ms. The GPU increase (~0.5 → ~1.8 ms) is documented with cost/fidelity tradeoffs (half-wall, reduced curtain, MSAA, ~52 MB target). Draws/tris: 3/227,074. |
| Visual intent | PASS | Translucent streaked curtain; rock and refraction visible through it. Refraction changes are confined to the ribbon (558,192–873,721; max 11). Off-beam lower water adds +5.7 luma over the wall vs +19.8 in the beam. No neon sheet. Glint placement nit above. Clips: portrait 10.124 s/296 frames, landscape 10.184 s/306, refraction toggle 10.18 s (ffprobe). |
| Maintainability/deployment | PASS | `wallResolution` rename, `samples` rebuild control, markers hidden/renderOrder 2. Commented GLSL, shared light/time, no new dependencies. Build passes with the existing >500 kB warning. |

Commands: `npm ci` (exit 0), `npm test` (10/10), `npm run build` (pass), `npm run dev -- --host 127.0.0.1 --port 5175 --strictPort` serving this checkout.

Environment:
- Browser: Edge 155 on Windows, RTX A4500, dedicated profile with CDP on 9334, launched with occlusion backgrounding disabled.
- Probes: `document.hidden` was false before probing.
- Viewport: 1440×900 at DPR1.
- Untracked probes and outputs are in the scratchpad: `C:\Users\ADAMTA~1\AppData\Local\Temp\claude\C--Users-Adam-Tate-orca-workspaces-Walden-Water-claude-m3-review\8d134f2f-904d-4cc2-b4f2-e153086c4ec2\scratchpad\` (`probe*.mjs`, `png.mjs`, `measure.mjs`, `out/*.png|json`, `frames/`).
- Logs: `..\m3r-{npmci,test,build,dev}.log`.
- Edge profile: `C:\Users\ADAMTA~1\AppData\Local\Temp\claude\m3r-edge-profile`.

## Manual verification

1. Open `?debug` and select the "flow bands" view. Bands should move down and widen toward the pool. Then switch to "water": the streaks should fall faster near the base.
2. Toggle refraction. Only the ribbon should change. With strength 0, the "refraction" view should equal the wall-only view, in both auto and byte precision.
3. Move the light source x/y. Glints and lit water should shift. The lower, off-beam water should stay dim.
4. Lose and restore the context three times, including once in byte mode. There should be no console warnings and rendering should resume.
5. Phone (due M4): run a physical iPhone and Android in portrait and landscape. Record the capture format, framing and cost.

## Gaps and next gate

Not tested here:
- Physical-phone visuals and cost (M4/M9).
- My own HMR run; I relied on the builder's `checks.json` to avoid source edits.
- Thermal equivalence.

Expected gaps: touch, splashes, shaft volume and pool. This approval covers only `a4b5516` and M3 scope.
