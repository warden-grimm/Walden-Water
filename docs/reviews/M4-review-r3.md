# M4 review — revision 3 (flow-speed and contrast tune)

- Mode: MILESTONE
- Base SHA: `a4b55164809c009fbb12b7d10929150ebc3ce3b0` (accepted M3)
- Reviewed head SHA: `86f9fd594e98719b8b0f059e4267c0c29cdad09a` (`git rev-parse HEAD` verified). New delta reviewed: `cc3f0b003e4c49ab46344b2ac4145d6a4305acbc..86f9fd5`. The rest of BASE..HEAD was reviewed in r1 (`e2a4583`) and r2 (`19d5bfd`). Those checks were reused, not re-run.
- Review workspace: Orca child checkout `C:/Users/Adam Tate/orca/workspaces/Walden-Water/claude-m4-flow-review`, branch `warden-grimm/claude-m4-flow-review`
- Reviewer: Claude
- Verdict: CHANGES REQUESTED (missing phone evidence only). **No code or visual blocker to publishing this tune.**
- Advancement: blocked

## Blocking findings

1. **Missing check: a real multi-touch phone run (`docs/milestones.md` M4 check 6 and Evidence).** This is unchanged from r2. This head adds no new phone evidence. The existing positive iOS Chrome "no lag" feedback still does not confirm two fingers held at once. It is not a code defect and needs no code change. Remedy: publish this head, then have the user run manual steps 1–3 below and record the device, OS and browser versions. Re-submit for verification only.

## Non-blocking findings

- After release the field now reaches exact neutral in 1.22–1.25 s. In r2 it took 1.31–1.45 s, because the faster flow also carries the wake down sooner. This is still inside the 1–2 s target. No action. Owner: builder. Due: note only, at the M4 phone check.
- Carried forward unchanged: velocity-strength saturation (builder, M4 phone retest / M5); idle field pass (builder, M8); M5 particles/lip; M6 shaft/glint; M8 HMR-after-forced-restore warnings; M9 long-uptime noise precision. The r2 evidence-script nit is fixed: `contrast-verify.mjs` now asserts the loaded defaults and the DOM down/up counts.

## Evidence and rubric

| Category/check | Result | Command, observation, artifact, or reason |
| --- | --- | --- |
| Scope/spec | PASS | `git diff --stat cc3f0b0..HEAD`: the only application change is 3 lines in `src/config.js` (`:6` rock `#4b555e→#48525b`; `:14` curtain `#9cbdc6→#a6c6ce`, opacity `.40→.43`; `:16` flowSpeed `1→1.15`). Everything else is evidence, the probe preset, the probe script and notes. No shader, geometry, pass, dependency or M5 change. All values sit inside their GUI ranges (`config.js:51,53`). `git diff --check cc3f0b0..HEAD` is clean. |
| Shader/field | PASS | One `uFlowSpeed` drives both the water phase (`water-common.glsl:11`) and field advection (`field.frag.glsl:18`, via `TouchField.js:80`). **Water speed** in the `flow bands` view: band frequency at a fixed point is 3.998 Hz at 1 and 4.608 Hz at 1.15, **×1.153** (expected 4.0/4.6) in the upper, middle and lower regions. Bands per 100 px: 0.79 upper vs 0.40 lower, so lower water still moves about 2× faster and the downward acceleration is kept. **Wake transport** (single tap, field centroid V): portrait 0.402→0.475 V/s (×1.18), landscape 0.429→0.500 V/s (×1.17). Wakes move downward. The ratio is slightly above 1.15, as expected from the gravity term. Field log appears once per format switch: RGBA16F, and RGBA8 packed16 when forced. |
| Interaction (desktop) | PASS | At the new defaults with drift on, 4 runs: portrait and landscape, each in auto and forced byte. Every run delivered **2 DOM touch pointerdowns and 2 pointerups**. During a 3 s hold, count stayed 2 and pressure stayed 0.849–0.850. The held centroid stayed pinned (V 0.4007→0.4007, after a 0.409 rise at 0.5 s). After release, count was 0 and the field reached **exactly 0 in 1219–1248 ms**. The screenshot shows two independent partings with gaps below. No console errors or warnings. |
| Interaction (phone) | **UNVERIFIED** (multi-touch) / qualitative pass (latency, r2) | Blocker 1. |
| Mobile/lifecycle | PASS desktop / UNVERIFIED phone | With no `?debug`: 0 GUI elements, and the canvas is 780×1688 and 1688×780 at DPR2. Lifecycle code is unchanged since r1. |
| Performance | PASS (unchanged pipeline) | Only uniform values change. Default snapshot: 4 draws, 227,076 tris, 4 programs, 4 geometries, 3 textures. Old and new values give identical counts both while touching and settled. My first probe read 5 draws, but that came from its own `inspectTouch()` readback draw, not the app. As briefed, no new 60 s sweep; the r1 matched runs still apply. Capture cadence (~53 fps headless) is not an FPS measurement. |
| Visual intent | PASS desktop | My frozen before/after frames match the builder's PNG luminance exactly. Rock is ~10% darker: 7.51→6.78 and 6.85→6.14 (portrait), 6.85→6.14 (landscape). Water in the beam is +0.5/+1.2: 80.4→80.9 and 68.6→69.8. Beam minus rock rises 72.9→74.1 and 61.7→63.6. Off-beam lower water is unchanged and dim: 28.9→28.8 and 31.7→32.1. Max pixel is 212/210 with 0% ≥240, so no clipping. Side-by-side: ledges, crevices and warm wet glints still show through translucent streaks. A small change, as requested ("just a little"). Clips: both mine and the builder's four WebMs show downward streak motion (73–87% of frame pairs move downward). |
| Maintainability/deployment | PASS | GUI controllers read `rock.color #48525b`, `curtain.color #a6c6ce`, `curtain.opacity 0.43`, `water.flowSpeed 1.15`. `npm run build` passes. Builder `smoke.json` agrees: defaults asserted, delivered 2/2, healed to 0. |

Environment: Windows 11, my own headless isolated Edge 155 (CDP 9334, scratch profile), mobile emulation at 390×844 and 844×390, DPR2, reference quality. Preview: `npx vite --host 127.0.0.1 --port 5175 --strictPort` serving this checkout. Commands: `npm ci` (0 vulnerabilities); `npm test` 17/17 pass; `npm run build` 572.09 kB / 146.99 kB gzip, with the existing >500 kB warning. Scratch probes and results (`review.mjs`, `bands.mjs`, `bands.py`, `draws.mjs`, `gui.mjs`, `lum.py`, `motion.py`, `out/results.json`, `out/cmp-*.png`, `out/*hold3s.png`, `out/*.webm`) are in `C:/Users/ADAMTA~1/AppData/Local/Temp/claude/C--Users-Adam-Tate-orca-workspaces-Walden-Water-claude-m4-flow-review/5f147099-8602-470a-ab50-a2be18fbea3d/scratchpad/probe/`.

## Manual verification (phone, published head)

1. Record the model, iOS version and browser version. Expected: dragging or pinching the scene does not scroll or zoom the page.
2. Watch without touching. Expected: the water falls a little faster and speeds up toward the bottom. Streaks are slightly clearer against slightly darker rock, and off-beam water stays dim.
3. Put **two fingers down at once** and hold for 3 s. Expected: two separate partings that stay under the fingers. Drag one slowly, then fast, and look for trailing lag. Lift both. Expected: wakes travel down and heal within about 1–2 s.
4. Optional: with `?debug`, set `touch.precision = byte` and repeat step 3. It should behave the same.

## Gaps and next gate

Still unverified: phone multi-touch, this tune on a phone, OS/browser versions, and mobile frame time. Publication: there is no code or visual blocker to publishing this head. M4 advancement requires step 3 to be confirmed on this head, or on a later head that I re-review. This verdict covers only `86f9fd5` and M4 scope; no M5 work is authorized.
