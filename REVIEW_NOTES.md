# Review notes

## PLAN — Milestone and reviewer setup

- **Status:** Revised plan accepted with APPROVE WITH NITS at `4f03b2b1603dce787de74eb63cce298f0d38753e`; see [PLAN-review-r2.md](docs/reviews/PLAN-review-r2.md). All seven original findings are resolved. No implementation milestone is approved.
- **Baseline:** `e03aed336d31985206bfb9be0ea88525cead4d64` records the starter and supplied briefs. The submitted head is in the Orca dispatch.
- **Changed:** Concrete deliverables/checks/evidence for M1–M9; independent review snapshots and stop/fix/re-review gate; repaired broken spec/notes links; Claude prompt, rubric, and report template.
- **Review scope:** `docs/working-agreement.md`, `docs/milestones.md`, `docs/reviewer.md`, and `docs/reviews/TEMPLATE.md`. Check ordering, conformance to `docs/goal.md`, gate scope, and evidence feasibility.
- **Known gaps:** Starter is not M1; no GitHub remote; no target-phone models/evidence; no waterfall shaders/simulation/effects yet.
- **Early risks:** Mobile geometry/overdraw; half-float and encoded-byte fallback; shaft mask before M6; impact contract across M5/M7. Plan names early proof points.
- **Clarifications/deviations:** Existing Vite remains allowed; no dependency added. Lifecycle starts at M1 and performance is checked every milestone; M8/M9 retain final integration/performance gates. M2 establishes light data before the M6 volume. Goal and milestone order unchanged.
- **Validation:** Documentation-only change. Baseline production build and desktop browser/subpath checks passed during setup; this does not count as waterfall acceptance or phone evidence.
- **Plan audit:** (1) Trace goal acceptance to milestones. (2) Follow a blocking M4 finding through fix/review/retest. (3) Confirm exact base/head and separate preview port. (4) Ensure missing phone/fallback evidence cannot become approval. (5) Confirm baseline is not mistaken for M1.

## PLAN — Resolve revision 1 findings

- **Status:** Claude independently verified all seven resolutions in [PLAN-review-r2.md](docs/reviews/PLAN-review-r2.md). This is plan acceptance only, not implementation or performance certification. The original [PLAN-review-r1.md](docs/reviews/PLAN-review-r1.md) is unchanged.
- **Changed files:** `docs/working-agreement.md`, `docs/milestones.md`, `docs/reviewer.md`, and `REVIEW_NOTES.md`. Product goal, milestone order, reviewer reports/template, application code, and dependencies are unchanged.
- **Review baseline:** No accepted implementation milestone exists; M1 uses `e03aed336d31985206bfb9be0ea88525cead4d64`. Later bases are the last accepted reviewed implementation head, not report-only commits; full review documents remain inputs. The revision's exact submitted head belongs in the dispatch.

| PLAN r1 nit | Resolution in this revision |
| --- | --- |
| 1 — Authority | `goal.md` governs the product; `milestones.md` governs operational scope/checks/evidence. The older agreement summary is an outline, not contradictory authority. |
| 2 — Camera drift | M1 owns subtle configurable breathing drift, disabled for reduced motion; fixed means no user orbit. M4 checks current-camera-matrix raycasts during drift and after resize/orientation changes. |
| 3 — Physical devices | Coordinator owns arranging/requesting evidence before M4; user or designated human tester supplies real-device runs. Assignments stay pending until confirmed; M9 requires named recent iPhone/Safari and mid-range Android/Chrome tests. |
| 4 — Regression trigger | Compare accepted baseline/candidate 60-second runs after 10-second warmup on matching device/settings/script/thermal conditions. >10% median OR p95 triggers investigation/documentation; unresolved material regressions block advancement, and reference-quality geometry changes need explicit cost/fidelity review. M9's sustained 60 fps target is unchanged. |
| 5 — Draft checkpoints | Use `M<n>-checkpoint-r<revision>.md` and DRAFT FEEDBACK: non-gating, no milestone approval or advancement. Blocking findings still halt dependent work until resolved. |
| 6 — Report names/base | Generic `<milestone>-review-r<revision>.md` supports PLAN; next base is the last accepted reviewed implementation head, not a report commit. PLAN creates no implementation approval; M1's baseline and full-document inputs are explicit above. |
| 7 — Phone latency | M4 checks current-frame pointer state before field update/render and physical-phone response without visible trailing lag, preferably with slow-motion recording. Record observations/method; numeric latency requires actual measurement. |

- **Outstanding external verification:** Coordinator must confirm human tester(s), phone models, OS/browser versions, and evidence access before M4; all assignments and device availability remain **pending/unconfirmed**. M4 still needs real multi-touch/latency and fallback evidence; M9 still needs named iPhone/Android performance and interaction runs. No phone tests, numeric latency results, or frame-rate certification were produced. Remote/Pages setup remains an external release need.
- **Validation:** All 16 local Markdown links/anchors across 8 Markdown files pass; `git diff --check` passes. Diff scope confirms only the four owned docs changed and the original PLAN report is preserved. No build or device test was run for these documentation-only edits; prior starter checks are not new milestone evidence.
- **Re-review audit:** (1) Compare all seven findings with this table and the revised documents. (2) Trace M1 drift/reduced motion into M4 camera/input ordering and phone observations. (3) Trace the regression trigger and pending phone evidence through the closed gate. (4) Confirm a checkpoint cannot approve advancement. (5) Confirm PLAN/report commits cannot replace M1's baseline and the original report is unchanged.

## Coordinator outcome — PLAN accepted

- **Reviewer workspace:** `claude-plan-review`, `C:/Users/Adam Tate/orca/workspaces/Walden-Water/claude-plan-review`. Separate checkout preserved with both committed reports; reviewer processes released after completion.
- **Orca run:** `run_bd53d2494d9a`. Initial review `task_d98868b19191`, documentation corrections `task_0eb0d69f2afb`, and re-review `task_0f3d648f9976` all completed successfully. These task outcomes do not certify implementation.
- **Accepted plan head:** `4f03b2b1603dce787de74eb63cce298f0d38753e`. Later review/status commits only record the outcome; M1 still uses the documented starter baseline.
- **Remaining nit A:** Extend `docs/reviews/TEMPLATE.md` with CHECKPOINT, DRAFT FEEDBACK, and `not approved by checkpoint`. Owner: coordinator/builder. Due: before the first M3 checkpoint. The reviewer prompt already specifies these values; Claude confirmed this does not weaken the gate.
- **External needs:** Physical testers/devices remain unconfirmed; arrange them before M4 and collect named iPhone/Android evidence for M9. Remote/Pages configuration remains pending for deployment.
- **Next:** M1 implementation may start as a separate milestone, followed by its own build/evidence/commit/Claude review. No M1 work was performed during this plan setup.

## Milestone submission template

### M1 — Scaffold and lifecycle submission

- **Status:** Accepted with **APPROVE WITH NITS** by Claude at `6af1797edb83f5677eb46ff49b92b713181e0240`. No blockers. M1 is complete; M2 has not started.
- **BASE_SHA:** `e03aed336d31985206bfb9be0ea88525cead4d64` (no earlier accepted implementation milestone).
- **Changed:** Replaced the sculpture/orbit demo with a dark wall, translucent curtain and lip/pool markers; fixed responsive camera and configurable breathing; shared simulation timeline; centralized config and lazy `?debug` lil-gui; DPR/resize/media preference handling; visibility/context/HMR cleanup and accessible recovery notice. Added focused Node tests for framing, clock and sample validity; updated README. Only new dependency: permitted `lil-gui@0.21.0`.
- **Validation:** `npm test` passes all 3 tests; `npm run build` passes; `git diff --check` passes. Main bundle warning remains documented (530.42 kB raw). `vite.config.js` and Pages workflow are unchanged; generated assets remain relative. No publication.
- **Preview:** Builder checkout at `http://127.0.0.1:5174/?debug`, strict port 5174. Reviewer must serve its own checkout on port 5175 with `--strictPort`.
- **Evidence:** [M1 evidence index](docs/evidence/M1/README.md), three viewport PNGs, drift/reduced-motion WebM, raw frame intervals, DPR/drag/layout checks, four HMR cycles, three context cycles and console log. Windows / Chromium 150 (Orca) and 151 (separate CDP), NVIDIA RTX A4500. These are desktop observations, not phone certification.
- **Performance:** First 60-second baseline after 10-second warmup: 3,412 frames, median 17.5 ms, p95 18.1 ms at 1440×900 / DPR 1, default drift on, GUI hidden, four draws/eight triangles and no effects. Workstation thermal/background conditions uncontrolled. No accepted M1 comparison exists yet.
- **Early verification issue and resolution:** Orca overrides page visibility, so the builder could only verify the actual handler with a controlled getter/event test plus clock tests. Claude subsequently verified **native desktop tab switching and OS window minimize/resume** in a separate Edge instance: frames freeze and the first resumed frame adds zero elapsed time. This closes the desktop evidence gap without an implementation workaround. Physical-phone pinch/backgrounding remain unverified and due before M4.
- **Manual review:** (1) Open ordinary URL, then `?debug`; verify GUI absence/presence and tune implemented controls. (2) Resize to 390×844, 844×390 and desktop; keep both markers visible, no scroll, cap DPR at 2. (3) Observe default drift, enable actual reduced motion, then drag: camera should remain fixed. (4) Hide/resume using a normal browser, checking paused frames and no time jump; inspect the controlled test limitation above. (5) Repeat context loss/restore and HMR, checking one GUI/canvas/loop and stable resources. (6) Run the fixed sample and production build; inspect relative assets.
- **Expected gaps:** Finished rock/water shaders, touch simulation, light volume, particles, pool and postprocessing are later milestones. Physical testers/devices remain unconfirmed; arrange before M4. No GitHub remote/Pages configuration yet.
- **Deviations:** None to M1 product scope. Tiny framing markers make the lip/future pool boundary reviewable. The GUI exposes only implemented features; diagnostic sampling protocol is fixed. Visibility test limitations are disclosed rather than counted as native success.
- **Review report/reviewed SHA:** [Claude M1 review r1](docs/reviews/M1-review-r1.md), exact head `6af1797edb83f5677eb46ff49b92b713181e0240`. The report is preserved unchanged.
- **Remaining prior nit:** Extend checkpoint report template before M3; coordinator/builder owns it.

### Coordinator outcome — M1 accepted

- **Orca run/task:** `run_6db9e1fd6f26` / `task_5fbc1a6306c4`; dispatch `ctx_a61438349715`. Claude's separate `claude-m1-review` checkout and committed report are preserved. Review worker released after the report and supporting evidence were committed; its preview and test browser were stopped.
- **Independent checks:** `npm ci`, 3/3 tests, production build, ordinary/debug URLs, GUI input, required orientations and ultrawide, DPR cap, reduced motion, trusted drag, emulated pinch/scroll, native desktop visibility, 3 context cycles, and 6 HMR cycles. Reviewer baseline: 3,395 frames after the fixed warmup/sample, median 17.6 ms / p95 18.2 ms. See [archived reviewer evidence](docs/evidence/M1/claude/README.md).
- **M2 baseline:** Use accepted implementation head `6af1797edb83f5677eb46ff49b92b713181e0240`, not later report/evidence/status commits. All follow-ups below must be considered at their stated gate.

| Follow-up | Owner | Due |
| --- | --- | --- |
| Add debug GPU timing with a CPU-submit fallback, or document a stress setting, because a refresh-bound frame interval can hide render-cost growth. Retain frame interval as the gating metric. | Builder | M2 |
| Derive the rock wall's minimum size from camera framing so its edges cannot enter very wide viewports (aspect above about 2.6). | Builder | M2 |
| Arrange real iPhone/Safari and Android/Chrome pinch, scroll and app-background checks alongside required multi-touch/latency evidence. Devices/testers still unconfirmed. | Coordinator | Before M4 |
| Add CHECKPOINT/DRAFT FEEDBACK/not-approved-by-checkpoint values to the report template (prior plan nit). | Coordinator/builder | Before M3 |

- **Next:** M2 is permitted by this review but was not started in this M1 task. No deployment was performed; GitHub remote/Pages setup and physical-device certification remain pending.

### M2 — Wet rock and shared light submission

- **Status:** Accepted with **APPROVE WITH NITS** by Claude at `0354151a78de0eaa228d58591d3618aa43358c51`. No blockers. M2 is complete; M3 has not started.
- **BASE_SHA:** `6af1797edb83f5677eb46ff49b92b713181e0240`, the accepted M1 implementation, not its later report commits. Submission head is supplied in the Orca dispatch.
- **Changed:** Procedural ridged/fBm vertex displacement with warped ledges and folded undersides; smooth normals from the same xyz surface; dark albedo/crevice moss and localized downward-moving wet sheen. Stable shared light uniform objects and a world-space cone/fade function establish the upper-left light. Added reference/reduced mesh controls, separate displacement/sheen toggles, normal/light/wet inspection views, geometry replacement disposal, and camera-derived wall coverage. Extracted existing camera behavior into a shader-independent module so framing remains directly testable.
- **M1 follow-ups addressed:** Ultrawide wall coverage is derived from the farthest relief depth and all camera drift phases. Debug-only GPU timer queries expose cost beneath the refresh cap, with CPU-render submission fallback, available-only asynchronous reads, disjoint rejection, and context/HMR ownership.
- **Contract:** [Scene/light contract](docs/scene-contract.md) specifies metres, +Y up, +Z toward camera, curtain z=0/pool y=0, stable shared time/light objects, axis/half-angle/penumbra/fade, normal math, quality and ownership. M3/M5 must consume it; visible shaft remains M6.
- **Validation:** `npm test` passes 6/6; `npm run build` passes. Main bundle is 541.10 kB raw / 136.89 kB gzip, with the existing >500 kB warning. No new dependency; relative Vite base and Pages workflow unchanged. Browser shader compilation has no errors. Three context cycles and four HMR cycles retain two geometries/two programs and resume rendering; genuine native tab switching pauses frames/time. Physical-phone behavior is still unverified.
- **Preview/evidence:** Builder strict port 5174; reviewer must serve its separate checkout on strict port 5175. [Evidence index](docs/evidence/M2/README.md) includes required orientations, 3840×720 ultrawide, reference/reduced and toggle captures, an eight-second wet-trickle WebM, raw frame intervals and browser lifecycle JSON. Windows / Edge 155 / NVIDIA RTX A4500 (ANGLE D3D11), 1440×900 / DPR 1 for timings, GUI hidden, default breathing on, idle/no interaction, no postprocessing.

| Final 10s warmup + 60s sample | Frames | Draws / triangles | Frame median / p95 ms | GPU median / p95 ms | CPU submit median / p95 ms |
| --- | ---: | --- | --- | --- | --- |
| Accepted M1 code, freshly measured | 3,597 | 4 / 8 | 16.7 / 16.8 | Not exposed in M1 | Not exposed in M1 |
| M2 reference 256×256 | 3,600 | 4 / 131,078 | 16.7 / 16.8 | 0.227 / 5.372 | 0.1 / 0.2 |
| M2 reduced 128×128 | 3,600 | 4 / 32,774 | 16.7 / 16.8 | 0.288 / 1.987 | 0.1 / 0.2 |

- **Performance disposition:** Neither frame median nor p95 increases by >10%; no gating frame-interval regression observed. GPU results are variable on this shared desktop: initial reference/reduced medians were 0.382/0.119 ms, and the final reduced median is slightly higher than reference. Do not infer a stable speedup from these refresh-limited runs. The reduced preset removes 75% of wall triangles and loses fine shelf rim/normal detail in matched captures; reference remains default for fidelity. GPU tails remain below the 16.7 ms target here, but temperature/clocks/background activity were not instrumented and thermal equivalence is unverified. Preserve both sweeps; measure real phone cost before selecting a mobile default. This is an explicit cost/fidelity review, not phone certification.
- **Early problems/fixes:** Flat triangle normals made specular response visibly faceted; central differences of the displacement surface repaired it. The old fixed-width wall exposed its edges on ultrawide views; conservative frustum sizing plus coverage tests through aspect 6:1 repaired it. An evidence-script GUI selector and media-change wait were corrected before submission; they did not require application changes.
- **Manual review:** (1) Open ordinary URL and `?debug`, then inspect portrait/landscape/ultrawide and DPR cap. (2) Set curtain opacity 0, compare reference/reduced with drift and trickle speed 0, and check rebuild disposal. (3) Toggle displacement and normals view: the normal output becomes flat; toggle sheen separately and restore trickle speed to 0.35. (4) Inspect light mask; move light position/target/cone and verify the rock glints follow it. (5) Repeat context loss/restoration, HMR and native tab switching with stable resources and no time jump. (6) Run the fixed sampler, inspect frame/GPU/CPU distinctions and the production build.
- **Scope/deviations:** Equivalent shared custom-light uniforms implement the permitted SpotLight alternative. Crevice occlusion is an artistic approximation; no shadow map or visible volume yet. A procedural folded sheet implements rock relief rather than a closed cliff mesh. Remaining water, interaction, particles, pool and postprocessing are future milestones. All implemented art/quality controls live in config/GUI; four fBm octaves and hash coefficients are fixed algorithm bounds/constants.
- **Outstanding external needs:** Physical testers/devices remain unconfirmed; arrange before M4. Named iPhone/Safari and Android/Chrome evidence is still required at later gates. No remote/Pages publication performed. The prior checkpoint-template nit remains due before the first M3 checkpoint.
- **Review report/reviewed SHA:** [Claude M2 review r1](docs/reviews/M2-review-r1.md), exact implementation head `0354151a78de0eaa228d58591d3618aa43358c51`. The report is preserved unchanged; its later commit is review evidence, not a new implementation acceptance base.

### Coordinator outcome — M2 accepted

- **Orca run/task/dispatch:** `run_d66abf8b04f8` / `task_0116f817e117` / `ctx_adbb7f54b776`. The review task succeeded with **APPROVE WITH NITS** and no blockers. Claude's separate `claude-m2-review` workspace and report commit `1e000da` are preserved. Reviewer servers on 5175/5176 and its dedicated Edge instance were stopped.
- **Independent evidence:** [Archived reviewer index](docs/evidence/M2/claude/README.md), with [archive provenance](docs/evidence/M2/claude/ARCHIVE.md). `npm ci`, 6/6 tests, build, GUI inventory, 8:1 ultrawide, quality/toggle/light checks, a normal agreement probe, downward advection observation, three context cycles, five HMR cycles, reduced motion and native visibility passed. All temporary source probes were byte-restored. The six independent timing runs include matched M1/reference/reduced, DPR-2 stress, and post-restore GPU timing. Frame median/p95 stayed at 16.7/16.8 ms; GPU results remain noisy and cannot select a phone preset.
- **Warnings surfaced:** Claude additionally captured WebGL disposal warnings when HMR follows forced context restoration, reproduced in accepted M1. These were not in the builder's error-only console filter. Rendering resumes with stable resources; Claude classified this as a pre-existing development-only nit due at M8, not an M2 blocker.
- **Next implementation base:** `0354151a78de0eaa228d58591d3618aa43358c51`. M3 is permitted but has not begun. No deployment or physical-phone certification was performed.

| Accepted follow-up | Owner | Due |
| --- | --- | --- |
| Measure and justify static vertex displacement/normal cost on physical phones before choosing the mobile preset; investigate baking/caching if necessary while preserving the specified procedural surface. | Builder | M4 phone runs; latest M9 |
| Reassess square noise cells and stepped shelf rims under the real water curtain; improve visible polish. | Builder | M3 |
| Bound the wet mask vertically to the curtain or explicitly document the intended extent above/below it. | Builder | M3 |
| Correct bounce-light contract wording, share the view-choice list, remove the source BOM, and improve disjoint warmup handling/invalid GPU labels. | Builder | M3 |
| Investigate the pre-existing Three.js disposal warnings on HMR after context restoration. | Builder | M8 lifecycle validation |
| Add CHECKPOINT / DRAFT FEEDBACK / not-approved-by-checkpoint to the report template. | Coordinator/builder | Before first M3 checkpoint |
| Arrange confirmed iPhone/Safari and Android/Chrome testers and evidence access; assignments remain unconfirmed. | Coordinator / human tester | Before M4 |

### M3 — Early curtain checkpoint

- **Status:** Claude returned **DRAFT FEEDBACK**, no blockers, for `a06955aaf217855e3e33f5c77231fe17845e48f9`. The architecture was independently verified and cleared for polish within M3. This does not approve M3 or M4. [Checkpoint report](docs/reviews/M3-checkpoint-r1.md); report-only commit `1b7af94` preserved before worker release.
- **BASE_SHA:** `0354151a78de0eaa228d58591d3618aa43358c51`, accepted M2 implementation. Exact checkpoint head supplied in dispatch.
- **Changed:** CPU curved ribbon at reference 120×400/reduced 60×200, travel-time downward acceleration, streak/coverage/Fresnel/glint shading with shared light/time, isolated linear wall capture and premultiplied final composition. Debug views and refraction/quality controls are wired; mesh/target rebuilds are labeled and disposed.
- **M2 diagnostic/contract nits:** Shared wall view choices, removed createScene BOM, warmup disjoint no longer poisons a later valid sample, explicit invalid GPU label, corrected bounce wording. CHECKPOINT values added to report template.
- **Validation:** `npm test` 10/10; `npm run build` passes (existing bundle warning). Native Edge shader compilation clean. Zero-offset refraction exactly matches wall-only pixels. Render-target/viewport/scissor/clear state survives successful and throwing captures. Evidence: [checkpoint index](docs/evidence/M3/checkpoint/README.md). Strict builder 5174; Claude must use its own checkout on 5175.
- **Manual:** (1) Observe flow bands moving down and spreading toward base. (2) Compare wall-only, zero-offset and offset refraction views. (3) Inspect UV orientation and actual curved mesh/raycast tests. (4) Read source isolation/state proof and resource ownership. (5) Check debug light moves the water mask; do not treat draft art as final acceptance.
- **Baseline:** Fresh accepted M2-equivalent runtime recorded before M3 edits at 1440×900 DPR1, Edge155/RTX A4500, 10s warmup +60s: 3,600 frames, median16.7/p9516.8ms; GPU median0.502/p954.676ms. [Raw baseline](docs/evidence/M3/baseline-timing.json). Final matched M3 cost remains pending.
- **Known gaps:** Art/quality-cost review, M2 wet-mask/noise polish nits, final portrait/landscape clips, lifecycle checks and full final review still due within M3. Touch, splashes, visible shaft and pool are later milestones.
- **Phone evidence:** Coordinator asked the user for iPhone/Safari and Android/Chrome testers/models/versions at M3 start; no confirmation yet. Assignments and evidence location remain pending. M3 can proceed; no phone performance claim.
- **Deviation:** Wall target also supplies the final background to avoid drawing reference wall geometry twice. Byte fallback is normalized linear RGBA8 with HDR clipping documented; signed field encoding remains M4 work. Static CPU bow ensures current raycasts match visible geometry exactly.

### M3 — Checkpoint follow-up and final evidence

- **Checkpoint ownership:** Orca run `run_47018a47ebbd`, task `task_4575d483718f`, dispatch `ctx_b08d3c165948`. Separate `claude-m3-checkpoint` workspace retained; worker released after preserving the report. [Archived independent probes](docs/evidence/M3/claude-checkpoint/ARCHIVE.md) remain tied to the draft head.
- **Addressed before final review:** Byte fallback now uses hardware-encoded/decoded SRGB8_ALPHA8 to improve shadow precision (HDR clipping remains). Old capture targets are abandoned on context restoration, avoiding stale GL deletion in the new context. Markers default hidden and draw after the curtain when enabled. Renamed `scale` to `wallResolution` and documented its full-background effect. Restored 4× target MSAA with a capability clamp and debug sample control. Normal differences now use metres and divide by the sampling interval; Fresnel clamps its dot product. Less opaque/streakier water, a soft lip and ragged sides replace the draft's uniform upper sheet.
- **M2 polish:** Layered rotated albedo and warped wet noise reduce square cells. Broader, less frequent shelves with smaller folds reduce undersampling at reference quality. The wet mask fades inside y=0/y=height and is zero outside (image checks confirm black above/below). Bounce wording, shared view choices, BOM, warmup disjoint handling and invalid labels are resolved.
- **Lifecycle:** Both orientation clips exceed 10s. DPR3 emulation caps the drawing buffer at 2. Eight quality/target rebuilds and three ordinary HMR cycles retain 3 geometries/1 texture/3 programs, one canvas/GUI. Genuine tab hiding freezes frames and shared time; reduced motion disables drift. Three context restores resume with zero warnings. The pre-existing HMR-after-restore issue still produces 45 stale-dispose warnings with the larger M3 resource set; rendering/resources recover. This remains a development-only M8 follow-up, separated from the new capture warning that was fixed. No shader/compiler or runtime errors observed.
- **Color/refraction:** At fixed time/camera, zero-offset views match wall-only captures exactly in both formats. Final byte/float max difference is 2/255; 4,053 vs 5,843 unique colors (improved from the draft's conspicuous linear-byte quantization, not a promise of equal precision). Refraction on/off and MSAA on/off captures are preserved. The reduced curtain removes 75% of its triangles; its static bow differs by at most 1/255 at the measured view. That result does not certify future M4 field deformation fidelity.
- **Evidence:** [Final captures and checks](docs/evidence/M3/final), scripts `verify.mjs`/`measure.mjs`; Edge155/RTX A4500/Windows, builder strict port5174. Physical phone behavior remains unverified. Two initial timing attempts were cancelled by settings/viewport notifications before completion and retained as invalid; completed runs are recorded separately. The repeat reference run has only its initial observer notification, no sampling-period viewport changes.
- **Build/validation:** `npm test` passes 10/10 including automatic incomplete-float-to-byte fallback; `npm run build` passes, 552.58 kB raw / 140.50 kB gzip main bundle (existing >500 kB warning). No dependencies or Pages configuration changed. Config keeps lip speed positive; the shader clamps negative sampling distance at the lip, and the checkpoint's extreme-value probe found no NaN/Inf. The final normal calculation additionally clamps Fresnel's dot product.
- **Manual final review:** (1) Preview ordinary URL and `?debug`; inspect portrait, landscape and ultrawide framing. (2) Follow flow bands down, then switch to water and compare the two orientation clips. (3) Freeze flow/drift, compare refraction off/on and zero-offset wall identity in auto/byte formats. (4) Move the light, compare glints, inspect the wet mask's lip/pool boundaries. (5) Compare curtain presets, full/half wall resolution and target MSAA, checking rebuild counts. (6) Run the fixed sampler, visibility/reduced-motion checks, context cycles and HMR; distinguish the pre-existing post-restore HMR warnings from normal recovery.
- **Final gate status:** Accepted with **APPROVE WITH NITS**, no blockers, at `a4b55164809c009fbb12b7d10929150ebc3ce3b0`; BASE remains `0354151a78de0eaa228d58591d3618aa43358c51`. [Claude final review](docs/reviews/M3-review-r1.md). No M4 work or deployment performed.

| Completed 10s warmup + 60s sample | Draws / triangles | Frame median / p95 ms | GPU median / p95 ms | CPU submit median / p95 ms |
| --- | --- | --- | --- | --- |
| Fresh accepted M2 baseline | 4 / 131,078 | 16.7 / 16.8 | 0.502 / 4.676 | 0.1 / 0.2 |
| M3 reference curtain, full wall target, MSAA4 | 3 / 227,074 | 16.7 / 16.8 | 1.744 / 4.765 | 0.1 / 0.2 |
| M3 reduced curtain only | 3 / 155,074 | 16.7 / 16.8 | 1.562 / 4.609 | 0.1 / 0.2 |
| M3 reference curtain, half wall resolution | 3 / 227,074 | 16.7 / 16.8 | 0.465 / 3.910 | 0.1 / 0.2 |
| M3 with curtain hidden | 2 / 131,074 | 16.7 / 16.8 | 0.871 / 2.332 | 0.1 / 0.2 |

- **Performance disposition:** Each completed run has 3,600 frame samples and 3,599 valid GPU samples; no disjoint event. Neither frame median nor p95 increased by >10%, so the gating regression trigger did not fire. Reference GPU median grew by about 1.24 ms (roughly 248%) vs M2, investigated through the no-water and half-resolution runs: the water fragment work, extra full-screen composition, richer wall noise and multisampled target add cost. The no-water comparison suggests about 0.87 ms median for the curtain in this sweep; these noisy shared-desktop GPU results are observations, not a stable cost model. All observed GPU p95s remain below the frame budget here. Reference geometry/full resolution/MSAA4 remain defaults for the specified fidelity; reduced curtain removes 75% of its triangles with negligible difference for the current simple bow, while half target resolution softens the entire background and quarters capture storage/pixels. The target's color storage alone is about 52 MB at 1440×900 before depth/canvas/driver overhead. Phone costs and preset selection are still unverified and assigned to the existing M4/M9 device gates; this is not mobile certification.

| Remaining follow-up | Owner | Due |
| --- | --- | --- |
| Verify water noise precision after hours of continuous uptime; avoid phase-wrap discontinuities if mitigation is required. | Builder | M9 |
| Pre-existing Three.js stale disposal warnings when HMR follows forced context restoration. | Builder | M8 |
| Confirm physical testers/models/browser versions and measure reference geometry/target costs before selecting phone presets. | Coordinator / human tester / builder | M4, final phone certification M9 |

### Coordinator outcome — M3 accepted

- **Orca run/task/dispatch:** `run_47018a47ebbd` / `task_06f6d400e9a1` / `ctx_a10d79027406`. Claude independently reviewed the exact final head and returned **APPROVE WITH NITS**, no blockers. The report was committed unchanged as `f20b538` in `claude-m3-review` before worker release and fast-forwarded into the builder checkout. Both M3 review workspaces are preserved.
- **Independent evidence:** [Archived final review probes](docs/evidence/M3/claude-final/ARCHIVE.md), with SHA-256-verified copies and command logs. Independent `npm ci`, 10/10 tests and build passed. Zero-offset wall identity passed exactly in auto and byte modes; byte/float maximum difference was 2/255. Three context restores, including byte, had zero warnings and stable resources; native tab hiding froze frames/time. Refraction stayed inside the ribbon and glints responded to the light source. Claude relied on the builder's recorded ordinary HMR evidence rather than editing the reviewed source.
- **Independent cost:** Matched 10s warmup +60s runs each captured 3,600 frames at 1440×900/DPR1. Reference frame median/p95 was 16.7/16.8 ms, GPU 1.854/1.922 ms; hidden curtain was 16.7/16.8 ms, GPU 1.283/2.128 ms. These corroborate the documented added cost without triggering the >10% frame regression gate. Physical-phone performance and thermal equivalence remain unverified.
- **Next implementation base:** `a4b55164809c009fbb12b7d10929150ebc3ce3b0`, not the subsequent report/archive commits. M3 is complete. M4 has not started; no deployment was performed. Testers, phone models, OS/browser versions and evidence access are still awaiting confirmation from the user.
- **Cleanup:** Review worker released and both workspaces marked completed. Reviewer port 5175/CDP 9334 and builder's temporary port 5174/CDP 9333 are closed. The user's existing preview on port 5173 remains running.

| Accepted follow-up | Owner | Due |
| --- | --- | --- |
| Break up the remaining straight lip and silhouette with the planned spray. | Builder | M5 |
| Retune glints toward the beam crossing when the visible shaft is added; current energy is concentrated high in the curtain. | Builder | M6 |
| Resolve pre-existing stale disposal warnings when HMR follows forced context restoration. | Builder | M8 |
| Check water noise precision after hours of continuous uptime. | Builder | M9 |
| Confirm physical testers/models/browser versions and evidence access; demonstrate real multi-touch/latency and evaluate geometry/target costs before selecting phone presets. | Coordinator / human tester / builder | M4; final named-phone certification M9 |

### M3 — First public device-testing deployment

- User authorized GitHub push and Pages publication on 2026-10-12 before M4. Public repository: [warden-grimm/Walden-Water](https://github.com/warden-grimm/Walden-Water). Live site: [Walden Water](https://warden-grimm.github.io/Walden-Water/); [debug diagnostics](https://warden-grimm.github.io/Walden-Water/?debug).
- Deployed `b8e91e1901de8472baf1c09c98ce2b5e7ac602a3` through [successful Actions run](https://github.com/warden-grimm/Walden-Water/actions/runs/38289697290). Tests 10/10 and production build passed locally and in CI. Application code is unchanged from accepted M3 `a4b5516`; CI now runs tests before deploying.
- [Deployment checks and captures](docs/evidence/M3/deployment/README.md): live assets match the local build, desktop/emulated portrait/landscape render and animate, normal/debug routes work, and no browser errors were observed. Physical-phone models, browsers, performance and tester evidence remain pending; M4 has not started.

### M4 — Touch field early checkpoint

- **Status:** Field architecture ready for independent draft review; no M4 acceptance or water deformation yet. BASE is accepted M3 `a4b55164809c009fbb12b7d10929150ebc3ce3b0`, not deployment/report commits. Exact checkpoint head is supplied in dispatch.
- **Physical-device update:** User reports M3 is “Running perfectly on iOS iPhone 15 Pro Max.” Tester: user; evidence: this conversation, 2026-10-12. This is qualitative M3 rendering feedback, not measured frame rate or M4 input evidence. iOS version/browser requested and pending; Android availability pending. M4 still needs the later real two-finger/latency check.
- **Changed:** Bounded Pointer Events tracking/capture, allocation-free analytical resting-curtain contacts, swept velocity-scaled/held splats, gravity-aligned advection/diffusion/decay, distinct field targets, exact packed16 byte fallback, actual GPU sampling validation, field overlay and debug-only inspection. No new dependency or deployment change. [Field contract](docs/scene-contract.md#m4-field-checkpoint).
- **Validation:** `npm test` 13/13, build passes (567.27 kB raw / 145.31 kB gzip main bundle; existing size warning). Contact tests compare both mesh qualities, both orientations and camera drift; input tests cover IDs, short taps, cancellation, lost capture, exit/reentry, blur/visibility and disposal. Native Edge 155/Windows/RTX A4500 probes show neutral reset in both formats, held pressure ≈0.849 after 3 seconds, downward wake centroids, two simultaneous contacts and cleared cancellation. Real timestamped release probes reach <1% pressure near 1.03s and exact neutral near 1.50s in both formats. Six size/format rebuilds and two context restores keep 4 geometries/3 textures/4 programs and emit no warnings/errors.
- **Evidence:** [Checkpoint index](docs/evidence/M4/README.md), auto/byte overlay recordings, captures, numerical checks/lifecycle results. Strict builder port 5174; Claude must serve its separate checkout at 5175 and use a separate CDP/profile if needed. The original clip's release labels are nominal waits; use `lifecycle.json` for measured elapsed recovery.
- **Baseline:** Fresh accepted M3 runtime before application edits at HEAD `ee68428`, code identical to accepted M3. 1440×900, DPR1, GUI hidden, default drift, idle, 10s warmup +60s: 3,600 frames, median/p95 16.7/16.8ms; GPU median/p95 1.376/4.133ms; CPU 0.1/0.2ms. Field checkpoint and final cost are separate measurements.
- **Checkpoint cost:** Field-on and field-off 10s +60s samples both returned 3,393 frames at median/p95 17.6/18.1ms. GPU median/p95 was 2.927/4.252ms on versus 1.181/3.621ms off; CPU 0.1/0.2ms. The identical frame cadence with the field disabled indicates that the slower cadence relative to the earlier M3 sample cannot be attributed to the field alone. The field does add roughly 1.75ms median GPU work in this sweep. Neither frame median (+5.4%) nor p95 (+7.7%) crosses the >10% investigation trigger; these are shared-desktop observations, not phone certification. Full M4 cost remains due after coupling.
- **Manual checkpoint:** (1) Open `?debug`, enable touch overlay and hold at top/middle/corners; colors should remain under contact with a downward tail. (2) Hold 3s, release and watch it heal; try slow/fast swipes. (3) Use two pointers and cancel/blur/leave/reenter; no held obstacle may remain. (4) Force byte and repeat, then rebuild targets/reset/restore context. (5) Verify no pass samples its write target and that frame order projects current input before the update. (6) Inspect the resting-surface strategy before adding displacement; final parting/foam, portrait/landscape clips, current-head cost and physical-phone evidence remain due within M4.
- **Scope:** This checkpoint is deliberately before deformation/foam. M5 particles and future shaft/pool are not included. No M4 code has been pushed to the public M3 site.

### M4 — Checkpoint outcome and fix ownership

- **Review:** [Claude checkpoint r1](docs/reviews/M4-checkpoint-r1.md), DRAFT FEEDBACK at `458f0bd87b5d32efaa71788b275480e9d1cda748`. One blocker: frame-delta velocity produces refresh-dependent strength when input events arrive more slowly than rendering. Coupling is stopped until fixed and independently rechecked. No M4 acceptance.
- **Ownership:** Builder owns event-timestamp velocity, mismatched-cadence tests, byte quantization residue, graceful terminal validation failure, and rapid re-press fixes before final M4. Also try the half-float-specific extension now while touching allocation. Bound/project the displaced contact centre when coupling later. Phone evidence remains pending.
- **Evidence:** [54 SHA256-verified reviewer files](docs/evidence/M4/claude-checkpoint/ARCHIVE.md). Independent contact peaks were within 0.5 CSS px; transport error <0.0005 v; normal context cycles and input cleanup passed. Reviewer frame median/p95 17.6/18.3 ms with field on/off/byte. The roughly +2 ms in-app GPU delta remained constant across 64×128 and 512×1024 fields, while the isolated pass took 0.02–0.08 ms. Attribute this to fixed pass/target-switch overhead or timer behavior on this desktop, not demonstrated field shading cost. Re-measure the complete interaction and on phones.
- **Orca:** Run `run_be8c890ffaab`, task `task_fc15f8e85c9d`, dispatch `ctx_982b82b336ce`. Report committed unchanged as `1761024` before release, fast-forwarded into builder. Worker released; review workspace preserved. Final exact-head review still required.

### M4 — Focused checkpoint fixes submitted

- **Blocker fix:** Input velocity now uses event timestamps and current-camera projections of both event points, separate from the swept render-frame segment. A configurable 50 ms hold bridges faster display frames, then returns a stopped finger to steady hold strength. No extrapolated contact or per-frame allocation. Tests cover 15 input/display cadence combinations, including 60 Hz input with 120/144 Hz frames.
- **Other findings:** Re-arm a pending pointer ID on rapid re-press; preserve existing sweeps when a second finger arrives. Packed-byte decay always advances by at least one code point per nonzero step, eliminating the recorded lateral residue. Unusable field validation now disables interaction/overlay, logs a reason, and supplies a neutral texture while water continues. Both color-buffer extensions can qualify for actual half-float validation. Also repaired backward characteristics crossing the launch lip at extreme flow settings.
- **Validation:** 15/15 tests and production build pass, 568.96 kB raw / 145.98 kB gzip main bundle (existing size warning). [Focused GPU evidence](docs/evidence/M4/fixes/results.json) clears all ten tested auto/byte recovery cases; no-transport default cases first read neutral at 1.75 s in a 0.25 s sampling grid. Forced startup/restore failure preserves rendering and emits only the expected touch-disabled warning; a normal reload recovers half-float. The input API now receives the rAF timestamp in milliseconds. Full coupled performance remains due; no broad timing repeat for this focused fix.
- **Manual recheck:** (1) Compare slow swipes with input slower than display updates and stop moving: boost remains steady during motion then expires. (2) Rapidly re-press a mouse ID, add a second finger mid-sweep, and release/cancel. (3) Run deterministic high-refresh byte recovery cases. (4) Corrupt field validation before startup and context restore: water must keep animating. (5) Remove the corruption and retry validation. Final water coupling, real-phone evidence, and full M4 review remain pending.

### M<n> — <summary>

- Status:
- Last accepted reviewed implementation head (BASE_SHA; use documented baseline for M1):
- What changed:
- Build command/result:
- Preview command/URL/port:
- Environment and evidence paths:
- Manual steps/expected results:
- Performance baseline/comparison:
- Known gaps:
- Deviations/reasons:
- Review report/reviewed SHA:
- Blocker disposition/retest:
- Remaining nits (owner/due milestone):
