# M4 review — revision 2 (contrast follow-up)

- Mode: MILESTONE
- Base SHA: `a4b55164809c009fbb12b7d10929150ebc3ce3b0` (accepted M3)
- Reviewed head SHA: `19d5bfd2f94da5e9e4e41ca3b0a74d9e1da26cfa` (`git rev-parse HEAD` verified). Fresh focus: `e6853139235198096b66ee60efe05b585578d30f..19d5bfd`. The rest of BASE..HEAD was already reviewed in r1 (`e2a4583`) and was not re-run here.
- Review workspace: Orca child checkout `C:/Users/Adam Tate/orca/workspaces/Walden-Water/claude-m4-contrast-review`, branch `warden-grimm/claude-m4-contrast-review`
- Reviewer: Claude
- Verdict: CHANGES REQUESTED (missing phone evidence only). **Code blocker to publishing this visual update: none.**
- Advancement: blocked

## Blocking findings

1. **Missing check: real multi-touch phone run (`docs/milestones.md` M4 check 6 and Evidence).** This carries over from r1, narrowed. New evidence: the user said "Working great on chrome in iOS No lagging or bugs." I accept that as a qualitative, positive phone observation of touch latency. It does not say that two fingers were used at once, that byte mode was forced, which drag speeds were tried, or what method was used. The iOS and Chrome versions are not given, and the iPhone 15 Pro Max is only assumed to be the device. The contrast revision has not been viewed on the phone either. Consequence: real multi-touch on a phone is still **UNVERIFIED**, and the latency observation is only partly recorded. Byte fallback is verified on desktop, which the gate accepts, so it does not block. Remedy: no code change is needed. Publish this head and ask the user to run manual steps 1–3 below. Record the device, iOS/Chrome versions and the `Touch field:` line if possible, plus whether two simultaneous fingers parted the water independently with no visible lag. Then re-submit for verification only.

## Non-blocking findings

- The change raises contrast more than it brightens the water. Measured on matched frozen frames, the water's own added light rose by +24–31% (beam and off-beam alike). Rock dropped by 11–21%. Composite brightness under the lit curtain is therefore almost unchanged (portrait 82.2→80.4, landscape 68.9→68.6 mean L). This fits "slightly darker rocks / brighter water" read as contrast. If the user wants the water itself visibly brighter after seeing it on the phone, raise `curtain.color` or `opacity` a little more. Owner: builder. Due: the user's phone check of this revision (before M4 acceptance).
- `contrast-verify.mjs` asserts the tracker's `snapshot().touch.count`, not the pointer events the DOM actually delivered. My probe added DOM pointerdown/up counters and they agree (2/2). Owner: builder. Due: M5 evidence scripts.
- Carried forward unchanged: velocity-strength saturation (builder, M4 phone retest / M5); idle field pass (builder, M8); M5 particles/lip; M6 shaft/glint; M8 HMR-after-forced-restore warnings; M9 long-uptime noise precision.

## Evidence and rubric

| Category/check | Result | Command, observation, artifact, or reason |
| --- | --- | --- |
| Scope/spec | PASS | `e685313..HEAD` changes only `src/config.js:6,14`: rock `#525c66→#4b555e`, curtain `#88adb7→#9cbdc6`, opacity `0.36→0.40`. The rest is evidence, `contrast-verify.mjs` and notes. No shader, interaction, pipeline, geometry, dependency or M5 change. Opacity stays inside its GUI range `[0,1]` (`config.js:51`). Nothing persists to storage, so returning users get the new defaults. |
| Shader/field | PASS (unchanged, r1) | The defaults reach only `uRockColor` (`wall.frag.glsl:25`) and `uWaterColor`/`uOpacity` (`water.frag.glsl:51,56`). Field code is untouched. The field-format log appeared once per load or switch: RGBA16F, RGBA8 packed16 when forced, then RGBA16F again. |
| Interaction (desktop) | PASS | My probe ran portrait and landscape, each in auto and forced byte (4 runs). Every run delivered **2 DOM touch pointerdowns and 2 pointerups**, the tracker counted 2, and peak pressure was 0.849–0.850. After release, count was 0 and the field reached **exactly 0 in 1.31–1.45 s**. No console errors or warnings. |
| Interaction (phone) | **UNVERIFIED** (multi-touch) / qualitative pass (latency) | Blocker 1. |
| Mobile/lifecycle | PASS desktop / UNVERIFIED phone | With no `?debug`: no GUI, and the canvas is 780×1688 and 1688×780 at DPR2. Lifecycle code is unchanged since r1. |
| Performance | PASS (unchanged pipeline) | Only uniform values changed: same 4 draws and programs. Alpha rises 11%, but blend cost does not change. Per the brief, no new 60 s sweep. The r1 matched runs still apply. No phone FPS claim. |
| Visual intent | PASS desktop | Matched frozen before/after shots in both orientations, plus zoom crops. Streaks read more clearly against the rock. Ledges, crevices and warm wet glints stay visible through the water, which is still translucent. Off-beam lower water stays subdued: composite 30.7→28.9 (portrait) and 32.5→31.7 (landscape). Its added light rose in the same proportion as in the beam, so the beam stays the focus. Max pixel 212→212, 0% ≥240: no neon or clipping. |
| Maintainability/deployment | PASS | All three values are existing GUI tunables. `npm run build` passes. `git diff --check e685313..HEAD` is clean (BASE..HEAD flags only whitespace in archived build logs). |

Environment: Windows 11, Edge 155 (isolated hidden profile, CDP 9334), RTX A4500/ANGLE. Mobile emulation at 390×844 and 844×390, DPR2, reference quality. Preview: `npx vite --host 127.0.0.1 --port 5175 --strictPort` serving this checkout (verified PID command line). Commands: `npm ci` (0 vulnerabilities), `npm test` 17/17 pass, `npm run build` 572.09 kB / 146.98 kB gzip with the existing size warning. Scratch probes, screenshots and JSON (`review.mjs`, `iso.mjs`, `lum.py`, `iso.py`, `out/results.json`, `out/iso.json`, `out/*.png`) are in `C:/Users/ADAMTA~1/AppData/Local/Temp/claude/C--Users-Adam-Tate-orca-workspaces-Walden-Water-claude-m4-contrast-review/18312380-fac5-417f-97a0-86531a0ea79b/scratchpad/probe/`. The builder's tracked `docs/evidence/M4/contrast/` was inspected and is consistent.

## Manual verification (phone, published head)

1. Note the model, iOS version and Chrome version. Load with `?debug` and record the `Touch field:` line if a remote console is available. Expected: the page does not scroll or zoom when you drag or pinch the scene.
2. Look at the scene without touching it. Expected: streaks are a little clearer, rock is a little darker but ledges are visible, and off-beam water is still dim. Note whether the water should be brighter still.
3. Put **two fingers down at once**: hold one, drag the other slowly, then fast. Expected: two independent partings with no visible trailing lag. They heal within about 1–2 s of lifting.
4. Optional: in the GUI, set `touch.precision = byte` and repeat step 3. It should behave the same.

## Gaps and next gate

Unverified: phone multi-touch, the contrast revision on the phone, OS/browser versions, mobile frame time. Chrome on iOS runs on WebKit; M9 still needs named iPhone/Safari and Android/Chrome tests. Publication: no code blocker. M4 advancement requires step 3 to be confirmed on this head, or on a later head that I re-review. This verdict covers only `19d5bfd` and M4 scope; no M5 work is authorized.
