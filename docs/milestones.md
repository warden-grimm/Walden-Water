# Milestone acceptance and review plan

Read [goal.md](goal.md) as the product authority and [working-agreement.md](working-agreement.md) for ownership and the stop/review/fix loop. This plan governs operational scope, checks, and evidence; the older working-agreement milestone summary is an outline. Every milestone ends with a runnable page, passing build, focused commit, evidence, and a Claude verdict for that exact commit. Do not start the next milestone before acceptance.

## Current state and early risks

- The existing Vite/Three.js starter builds, uses relative URLs, caps DPR, pauses when hidden, and has basic teardown. It is not M1: replace the sculpture/orbit demo with fixed-camera wall/curtain placeholders, `config.js`, and a hidden GUI.
- The reference wall (256 × 256 segments) and curtain (120 × 400) together approach 230,000 triangles before particles and overdraw. These are reference settings, not proof of a mobile budget. Measure in M2/M3 and expose reduced quality presets; record fidelity deviations.
- M5 needs the shaft mask before M6 draws the volume. Establish shared light direction/cone/intensity data in M2; M3/M5 consume it and M6 adds the visible volume. Do not create inconsistent light models.
- M4 must prove half-float framebuffer support, UV orientation, and byte encoding. Allocation success alone does not prove a usable target. Demonstrate downward transport in the debug field before coupling all effects.
- M5/M7 need shared pool height and an impact contract. Choose GPU/analytical impact data without synchronous GPU readback or per-frame object allocation; document the choice in M5.
- A GitHub remote, actual target phone models, and phone measurements are not available yet. These are open verification needs, not passing checks. Desktop resize does not prove mobile GPU performance.
- Before M4, the coordinator must arrange/request physical-phone evidence from the user or a designated human tester, who supplies the real-device runs. Tester/device assignments remain pending in `REVIEW_NOTES.md` until confirmed; record model, OS/browser, and evidence location when available. M9 requires named recent iPhone/Safari and mid-range Android/Chrome tests; no phones are presumed available.

## Evidence at every gate

Record build result, changed files, gaps/deviations, and a 3–6 step manual script in `REVIEW_NOTES.md`; put exact base/head SHAs in the dispatch. Include portrait/landscape captures when visuals change and a short recording for time-dependent behavior. Large recordings may live outside Git at durable paths/links accessible to the reviewer; do not publish automatically.

In the review workspace, use `npm ci`, `npm run build`, and `npm run dev -- --port <free-port> --strictPort`. Give the reviewer its own explicit port so it cannot accidentally view the builder's server. Record the served checkout and URL. If browser/device access is unavailable, mark affected checks **unverified**.

For visible milestones, record viewport, browser, device/GPU if known, DPR, enabled effects, buffer dimensions, draw calls/triangles, and median/p95 frame time over 60 seconds after a 10-second warmup. Use debug-only counters/typed buffers; keep instrumentation out of the production hot path.

From M2 onward, compare two comparable 60-second runs (accepted baseline and candidate), each after a 10-second warmup, on the same device/browser with matching viewport, DPR, quality/effects, interaction script, and thermal conditions. A >10% increase in **either median OR p95** frame time triggers investigation and documentation of settings, samples, cause, and disposition in `REVIEW_NOTES.md`. Unresolved material regressions block advancement. Reference-quality geometry changes require explicit cost/fidelity review of measured cost and visible tradeoffs before acceptance. This early trigger does not change M9's sustained 60 fps target.

Early M3/M4/M6 reports use `docs/reviews/M<n>-checkpoint-r<revision>.md` and **DRAFT FEEDBACK**. They are non-gating and do not approve a milestone; blocking findings still halt dependent work until resolved. Full milestone approval requires the separate exact-head review.

## M1 — Scaffold and lifecycle

**Deliverable:** Dark full-screen scene with a wall plane behind a translucent curtain placeholder; fixed camera framed for both orientations with subtle configurable breathing drift, disabled when `prefers-reduced-motion: reduce` applies; one shared time source; centralized config; `?debug` lil-gui; resize/DPR/lifecycle handling. Fixed means no user orbit: ordinary drag must not orbit the camera. Preserve the Pages build.

**Reviewer checks:**

1. Without `?debug`, no GUI; with it, implemented camera/render/placeholder tunables work. Future controls are absent or disabled explicitly.
2. At 390 × 844, 844 × 390, and desktop size, the lip and future pool line stay in frame, curtain fills most useful height, and wall stays behind it. No page scroll or gesture zoom on the scene surface.
3. DPR stays at or below 2; buffer dimensions follow resize; shared time cannot jump on resume; hidden tabs stop rendering.
4. Repeated HMR and context loss/restoration leave one canvas/loop/GUI and no accumulating resources/listeners. Restoration resumes cleanly or offers a clear controlled restart.
5. Breathing drift is subtle and configurable in `config.js`/debug GUI, preserves framing, and stops while the reduced-motion preference applies. User dragging never changes camera framing.

**Evidence:** Both viewport captures, drift/reduced-motion clip, baseline frame-time sample, lifecycle/console results. Missing physical-device checks are explicit; M1 does not certify final mobile performance.

**Expected gaps:** Finished shaders, simulation, and effects. The sculpture/orbit demo is not a substitute for the required placeholders.

## M2 — Wet rock and light contract

**Deliverable:** Layered ridged/fBm displacement and wet-rock shader: ledges/cracks, dark variation, restrained moss, moving wet highlights. A SpotLight or equivalent shared light uniforms establish the upper-left shaft direction and upper-middle curtain intersection.

**Reviewer checks:** Normals match displacement; rock reads as 3D without uniform gloss or brightness. Toggle displacement/wet sheen separately. Check shared light data and quality presets in both orientations.

**Evidence:** Matched captures and cost against M1 at reference/reduced geometry settings. Flag geometry cost now. Record shared world units, curtain position, pool height, and light parameters.

**Expected gaps:** Visible shaft and finished water.

## M3 — Falling water curtain

**Deliverable:** Curved ribbon with accelerated downward flow, stretched streaks, edge/lower breakup, Fresnel response, wall refraction/distortion, and localized glints. Translucent water stays subdued outside the beam.

**Early checkpoint:** Prove flow direction, transparency sorting, and the wall-refraction source before polishing. Targets must not sample themselves, include the curtain recursively, or leak renderer state.

**Reviewer checks:** Follow water from lip to base; bottom flow is faster, rock remains visible, edges tear, and glints follow the debug light. No neon sheet or uniform brightness. Inspect the UV/world-space contract for M4.

**Evidence:** Ten-second clips in both orientations, refraction on/off comparison, shader/compiler logs, and cost/overdraw observations. Document raycast UVs, field texture orientation, curtain dimensions, and downward-flow convention.

**Expected gaps:** Touch and splashes.

## M4 — Touch field (critical gate)

**Deliverable:** Pointer IDs/capture/cleanup, curtain UV raycasts, ping-pong splat/advection/diffusion/decay, held-finger obstacle, vertex parting/foam, field overlay, and tested half-float/byte paths.

**Early checkpoint:** Submit the debug field with stationary and moving splats. Prove target separation, downward transport, decay, and fallback before polishing water deformation.

**Reviewer checks:**

1. Touch top/middle/corners with breathing drift running; raycasts use the current camera matrices and field marks coincide with contact. Repeat after resize/orientation change. Two fingers act independently; dragging does not control the camera.
2. Hold for three seconds: the gap remains. Release: wake moves down and heals in roughly 1–2 seconds. Repeat after orientation change.
3. Slow/fast swipes produce appropriate strength independent of refresh rate. No overflow/NaN, wrapping ghosts, or upside-down advection.
4. Leave the canvas, cancel a pointer, blur/hide, and release capture: no stuck touches. Verify no pass reads its active write target.
5. Force byte mode and repeat. Verify range/neutral value/encode/decode/filtering, reset, resize, and context restoration. Log the chosen path once, not per frame.
6. Verify current-frame pointer state is consumed before the field update/render. On a physical phone, observe slow/fast drags: splats/parting track contact with no visible trailing lag, preferably evidenced by a slow-motion recording. Record the observation and method; report numeric latency only if actually measured.

**Evidence:** Debug/final-water clips including drift/raycast alignment; a real multi-touch phone run with tester/model/OS/browser and latency observation; recovery timing; both path logs; cost delta. Missing multi-touch, phone latency observation, or fallback evidence blocks this gate.

**Expected gaps:** Splash particles (M5). Parting must work without particles hiding a defective field.

## M5 — Droplets, spray, dust, and mist

**Deliverable:** GPU-updated lip/base spray and bounded touch bursts with direction/gravity; drifting dust/mist within the shared shaft mask. Establish the M7 impact contract without per-frame readback.

**Reviewer checks:** Fast swipes throw directional arcs; held fingers do not grow unbounded emitters. Particles retire/recycle, have soft edges, stay dark outside the mask, and avoid obvious sorting artifacts. Stress multi-touch bursts for 60 seconds.

**Evidence:** Burst/mask clips, bounded counts, allocation/cost observations, impact contract. The visible beam remains deferred to M6.

## M6 — Volumetric shaft

**Deliverable:** Tapered, noisy, pale warm shaft from upper left, softly intersecting geometry and fading before the pool. Reuse shared light data.

**Early checkpoint:** Expose depth fade at temporarily raised intensity. Check depth source, linearization, camera near/far, and render-order isolation before art tuning.

**Reviewer checks:** Move debug light/geometry to reveal hard clipping, sorting, or mismatched glints. Resize both orientations; depth sampling stays aligned. At defaults the dim shaft is the focal point, not a bright solid cone.

**Evidence:** Depth-debug/final captures, enabled/disabled cost, and target cleanup/reset results.

## M7 — Pool and impacts

**Deliverable:** Dark reflective/rippled pool, continuous waterfall impact rings, touch-splash landing rings, and integrated low mist.

**Reviewer checks:** Rings occur where/when droplets reach pool height, not at arbitrary screen positions. Verify coordinate mapping, bounded lifetimes/counts, reflection quality, and portrait cropping. Pool stays subordinate to shaft.

**Evidence:** Waterfall-only/touch-impact clips, contract conformance, 60-second stress/cost observations.

## M8 — Post-processing and polish

**Deliverable:** Individually toggleable bloom/grain/vignette; ACES/sRGB output; adaptive DPR (2 → 1.5 → 1 under sustained overload) with hysteresis; lifecycle integration. Optional audio/haptics are separate.

**Reviewer checks:** Disable each pass, then all. Glints bloom without washed-out shadows or double tone mapping. Force sustained overload/recovery: renderer/composer/depth/refraction dimensions and pointer mapping stay consistent; resolution does not oscillate. Recheck visibility/context/HMR/GUI cleanup with effects enabled.

**Evidence:** Toggle captures, DPR/frame-time trace and actual buffer dimensions, lifecycle tests. Throttling can exercise adaptation but cannot prove phone performance.

## M9 — Performance and release readiness

**Deliverable:** Profiled final presets and evidence for all six goal acceptance criteria; repeatable production build at a Pages repository path.

**Reviewer checks:** Run tests on a named recent iPhone/Safari and a named mid-range Android/Chrome device, with confirmed human testers; test orientation and two fingers on both. Record 60-second idle/interaction samples after warmup, thermal conditions, and GPU timings where available. Target sustained 60 fps (about 16.7 ms/frame); include median/p95 and dropped frames. Average-only screenshots or desktop emulation do not pass. Document weaker-device degradation separately.

Inspect hot paths for allocations/leaks, synchronous readbacks, unnecessary passes, overdraw, and unbounded emitters. Serve `dist/` at `/Walden-Water/`; verify assets, `?debug`, and interaction. Actual publication requires a remote and Pages configuration; report that status accurately.

**Evidence:** Device/browser versions, presets, target sizes/types, DPR transitions, draw calls/triangles/particles, allocation profile, performance samples, final portrait/landscape clips, limitations, and complete goal acceptance checklist. Missing target-phone evidence blocks release readiness.
