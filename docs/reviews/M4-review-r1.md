# M4 review — revision 1

- Mode: MILESTONE
- Base SHA: `a4b55164809c009fbb12b7d10929150ebc3ce3b0` (accepted M3)
- Reviewed head SHA: `e2a45837b75a1f4c0b135c229dd265a682428867` (`git rev-parse HEAD` verified before review)
- Review workspace: Orca child checkout `C:/Users/Adam Tate/orca/workspaces/Walden-Water/claude-m4-review`, branch `warden-grimm/claude-m4-review`
- Reviewer: Claude
- Verdict: CHANGES REQUESTED (missing critical evidence only; no code defect found)
- Advancement: blocked

## Blocking findings

1. **Missing check: real multi-touch phone run and phone latency observation** (`docs/milestones.md` M4 check 6 and Evidence; `docs/reviewer.md` "Do block M4 if…"). The only physical-device evidence is the user's qualitative M3 report on an iPhone 15 Pro Max. It has no OS/browser version and no M4 input. Consequence: the gate's critical checks for touch feel, multi-touch, mobile scroll/zoom suppression and on-device half-float/byte selection stay **UNVERIFIED**. Desktop CDP touch emulation cannot stand in for them. Remedy: this is an evidence gap, not a code change. Publish this exact head as a device-test candidate and have the named tester run `README.md#m4-candidate-device-check` plus the manual script below. Record the model, OS/browser, field-format log line and the method used (preferably a slow-motion recording), then submit for re-review. **Code blocker to publishing as a physical-device test candidate: none found.**

## Non-blocking findings

- Velocity scaling saturates at a slow drag. `src/config.js:23`: with `holdStrength 0.85`, `velocityGain 0.12` and `maxStrength 1`, strength hits its cap at about 1.25 m/s. That is about 175 CSS px/s in portrait, where the 2.8 m curtain spans about 390 px. My slow sweep (about 1.4 m/s) and fast sweep produced the same peak pressure (0.9990 vs 0.9995). Slow and fast drags therefore differ only in sweep length, not strength. This is a tuning question, not a refresh-dependence defect. Owner: builder. Due: M4 phone retest, judging "fast swipes slash, held finger calmly parts"; at the latest M5, when splash velocity is added.
- The field pass runs every frame even when the field is neutral and nothing is touching. Independently measured GPU median: 1.60 → 3.38 ms idle, 1.56 → 3.45 ms touching. Frame time is unchanged because this desktop is vsync-bound. Consider skipping the update once the field has been neutralized with no contacts. Owner: builder. Due: M8 adaptive/perf work, sooner if phone frame time regresses.
- Preserved known items, unchanged and with their existing owners: M5 particles/lip breakup; M6 shaft/glint balance; M8 HMR-after-forced-restore warnings; M9 long-uptime noise precision.

## Evidence and rubric

| Category/check | Result | Command, observation, artifact, or reason |
| --- | --- | --- |
| Scope/spec | PASS | The diff touches only the touch tracker, field, contact, field/water shaders, config/GUI, tests, docs and evidence, plus an `npm test` step in the Pages workflow. No particles, M5 work or new dependencies. |
| Field: UV/sign/advection | PASS | v is bottom-up and the lip is at v=1. The backtrace samples upstream (above) with lip-crossing exterior returning neutral (`field.frag.glsl:17-24`). Lateral sign pushes away from the contact; the overlay is red on the left and blue on the right. Held centroid v ≈ 0.57 with a downward tail. |
| Field: neutral/byte/validation | PASS | packed16 neutral is (128,0,0,0) and decoding happens before manual bilinear interpolation. Validation renders, reads quadrant sign/pressure through **vertex** sampling, then checks neutral (`TouchField.js:41-70`). My log shows RGBA16F, then RGBA8 packed16 when forced, each logged once. Byte hold reached 0.8485, then exactly 0 after release. |
| Field: ping-pong | PASS | `draw()` rejects a pass that reads its own write target; snapshot `distinctTargets` is true. Curtain reads `read` only after the update. |
| Interaction: camera/frame order | PASS (desktop) | `pointers.update(world.camera)` runs after `updateCamera` and before `field.update`/render (`main.js:49-53`). Pressure-view peak vs touch point, with drift on: 6 contacts in portrait and landscape, error ≤0.28 CSS px (a half-device-pixel bias). Off-curtain landscape points correctly gave 0 contacts. |
| Interaction: velocity/expiry/jitter | PASS (code + tests) | Event-timestamp window, render-clock expiry and a bounded ring buffer. 17/17 tests pass. Scaling range: see nit. |
| Interaction: hold/two fingers/cancel/blur/hide | PASS (desktop) | 3 s hold kept pressure 0.848 with a visible gap. Two contacts → touchCancel → 0. Pressure fell to 0.026 at +0.6 s and was neutral by +2.1 s. Blur cleared a held finger and later moves were ignored. Hide/HMR: builder lifecycle evidence plus code inspection; not rerun. |
| Interaction: phone latency, real multi-touch | **UNVERIFIED** | Blocker 1. |
| Deformation normals/alignment | PASS | View-ray push preserves the projected centre. The derivative delta (bent − rest) keeps the M3 bow. No faceting at the held contact. |
| Visible parting/foam/healing | PASS (desktop) | Rounded opening with a downward channel; a fast swipe gives a slash; a faint lit rim; healed by about 2 s. |
| Mobile/lifecycle | PASS desktop / UNVERIFIED phone | Byte and auto context restores both recover with pointer and field. Three size rebuilds keep 4/3/4 geometries/textures/programs. `touch-action:none`; DPR is independent of field size. Phone orientation and scroll/zoom are untested. |
| Performance | PASS desktop / UNVERIFIED phone | My sequential matched 10 s + 60 s, 1440×900, DPR1 runs (frame median/p95 ms): M3 idle 17.7/18.2 vs M4 17.8/18.4; touching 17.7/18.4 vs 17.7/18.3. Below the >10% trigger. Two delivered touch-downs were asserted. Draw calls go from 3 to 4. Hot loop allocates nothing; `inspect` is debug-only. |
| Visual intent | PASS desktop | Restrained, shaft-lit foam, wall revealed in the gap, no neon. Phone viewing untested. |
| Maintainability/deployment | PASS | All tunables are in `config.js`/GUI with rebuild labels. Shaders are commented. Shared time/light are kept. `base: './'` gives relative assets. Disposal covers field, neutral texture and listeners. |

Environment: Windows 11, Edge 155 (isolated profile, CDP 9334), NVIDIA RTX A4500/ANGLE. Viewports: 390×844 and 844×390 at DPR2 with mobile emulation; 1440×900 at DPR1 for timing. Preview: `npx vite --host 127.0.0.1 --port 5175 --strictPort`, plus read-only M3 on 5176. Commands: `npm ci` (0 vulnerabilities), `npm test` 17/17, `npm run build` (572.09 kB / 146.98 kB gzip, existing size warning). Scratch probes, screenshots and timing JSON: `C:/Users/ADAMTA~1/AppData/Local/Temp/claude/C--Users-Adam-Tate-orca-workspaces-Walden-Water-claude-m4-review/7e6f37c4-e30f-4f14-8285-06547e036aaf/scratchpad/probe/` (`p1/`, `timing/`, `p1.mjs`, `align.py`, `measure.mjs`).

## Manual verification

1. On the phone (record model, OS/browser): load the candidate with `?debug`, open the console or remote inspector, and confirm one `Touch field:` line. Page must not scroll or zoom when dragging or pinching the scene.
2. Hold one finger at top, middle and a corner for 3 s. The opening should stay under the fingertip with a downward channel. Lift: the wake travels down and heals in about 1–2 s.
3. Two fingers: hold one and drag the other slowly, then fast. Each acts independently, the parting tracks the fingertip with no visible trailing lag (slow-motion video preferred), and fast drags read as a slash.
4. Rotate while holding, then lift; switch apps or lock while holding, then return. No stuck gap.
5. Force `touch.precision = byte` and repeat steps 2–3. The behavior should match, apart from fine quantization.

## Gaps and next gate

Untested: physical-phone touch and latency, mobile GPU frame time and thermal behavior, an independent HMR rerun, and real browser-zoom suppression. Advancement requires blocker 1 to be evidenced on this exact head, or on a later head that I re-review. This verdict covers only `e2a4583` and M4 scope.
