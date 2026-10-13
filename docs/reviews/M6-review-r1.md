# M6 review — revision 1

- Mode: MILESTONE
- Base SHA: `900eb9648d58cb68ad735915c9561f454c87aaff` (accepted M5)
- Reviewed head SHA: `d02b1975ca43f1a9ff323bdfebd36eb3e316d824` (`git rev-parse HEAD` verified)
- Review workspace: `scratchpad/m5-review` (detached at HEAD); M6 preview at `http://127.0.0.1:5176/`, and an M5 baseline (`git archive 900eb96`) on 5177, both `--strictPort`
- Reviewer: Claude
- Verdict: **APPROVE WITH NITS**
- Advancement: permitted to M7 once the coordinator records the outcome and the nit dispositions below. Phone look and cost remain UNVERIFIED.

## Blocking findings

None.

## Non-blocking findings

- **Mote attenuation nit reached its due date without a disposition.** The M5 nit "motes not attenuated behind the translucent curtain; mist sprite edge spill past the cone" was owned by the builder and due at M6. The M6 submission doesn't mention it, and the particles still draw after the water at full strength. The affected slab is thin because `wallFade` removes motes within 0.4 m of the wall, so this is not visible at defaults. Record a disposition: fix it (for example, scale mote alpha by the curtain's resting transmission when the mote is at z < curtain z), or re-date it with a reason. Owner: builder. Due: before M7 starts, in REVIEW_NOTES.
- **Phone fill cost.** I confirmed the GPU numbers in matched runs (below): the shaft adds about 0.7 ms median and 1.6–1.8 ms p95 GPU on this desktop. Two full-screen passes with 14 samples are the largest per-pixel cost so far. The disposition (levers `samples` and `enabled`, a possible half-resolution target, M9 presets with real phone timing) is acceptable. Owner: builder. Due: M9, sooner if the user's phone stutters.
- **Lip gradient: closed.** With the curtain visible, the edge and lip jumps stay within about 1–2/255 of their neighbours. Lip jump vs neighbours: desktop 6.1 vs 5.2, portrait 3.7 vs 3.8, landscape 7.3 vs 5.7. This is the water's own lip fade, and it isn't visible at defaults. No action needed.
- **Minor.** `shaft.frag.glsl:87` hard-codes `uDrift * 0.5` as the haze's second-axis drift ratio, a small art constant. Fold it into config when convenient. Owner: builder. Due: M9.
- **Carried items keep their owners:** the M8 warnings after HMR that follows a forced context restore; M9 burst saturation and shader spreads; the M7 lip-origin clamp.

## Evidence and rubric

| Category/check | Result | Command, observation, artifact (scripts and images in `review-scratch/`, `out-m6full/`) |
| --- | --- | --- |
| Scope/spec | PASS | Analytic two-pass volume, depth-texture clip, curtain split with exact encoded sums, and debug views; all inputs come from the shared light. Deviations (no cone mesh, no SpotLight) are documented and consistent with the contract. No M7 or M8 work. |
| Visual intent at defaults | PASS (desktop) | `m6look.mjs` at 1440×900 DPR1, 390×844 DPR2 and 844×390 DPR2. A dim warm beam with fine streaks enters from the upper left, lights the upper-middle curtain and fades before the pool. It is the focal point, not a solid cone; with the shaft off the frame is otherwise unchanged. Portrait shows a broader upper-left haze, still subdued. Phone look: UNVERIFIED. |
| Moved light / glints / clipping | PASS | Three light moves within the GUI ranges (`desk-moves.png`). The beam, the wall `light mask` view and the lit rock and water move together. The beam meets the rock softly with real occlusion, with no hard lines and no sorting artifacts. When the light is far (10 m range fade), the beam vanishes consistently with the mask. Earlier checkpoint runs covered the cone math: camera inside the cone, apex on screen, grazing rays. |
| Seam / curtain split | PASS | `seam-full.mjs` in three viewports. Curtain hidden: edge jump equals neighbours (for example 3.8 vs 3.8). Curtain visible: within about 1–2/255. Behind-curtain attenuation inside the footprint: 53.1 vs 58.4 (desktop), 52.7 vs 58.0, 53.7 vs 58.3. |
| Depth alignment | PASS | `m6depth.mjs` in portrait and landscape. Samples 0, byte capture, wall resolution 0.5, three orientation round trips, context restore and HMR are all within 0–7/255 of the reference, with at most 0.011% of pixels above 3. Flat-wall linearisation: 10.0 m vs 9.99 m expected, and 11.27 m vs 11.25 m. |
| Target cleanup/reset | PASS | Textures stay at 5 (the depth texture included) across capture rebuilds, rotations, restores and HMR. HMR on `main.js`, `LightShaft.js` and `WallCapture.js` keeps 1 canvas, 8 geometries, 5 textures, 8 programs and 9 draws, with touch valid. |
| M4/M5 regressions | PASS | Lifecycle probe: a held finger with jitter gives 1 burst; a slow drag gives 1; slot/count rebuilds stay at 8 geometries and 5 textures; swipes splash; bursts and touch disabled give 0; byte mode gives 9 bursts with packed16; a hidden page clears contacts; two context restores resume (touch valid, 9 bursts); no console warnings. |
| Performance (matched, sequential, 1440×900 DPR1, 10 s + 60 s) | PASS | Display at about 57 Hz for every run. Idle: M5 17.8/18.1 ms median/p95 frame, GPU 3.50/5.28 ms; M6 17.9/18.1, GPU 4.25/7.06; M6 shaft off 17.7/18.1, GPU 3.54/5.40. Interaction: M5 17.7/18.1, GPU 3.55/5.36; M6 17.8/18.1, GPU 4.23/6.94. Frame median/p95 rises at most 0.6%, so the trigger is not fired. The shaft accounts for about 0.71 ms GPU median. Draws 7→9, programs 7→8, textures 4→5. |
| Maintainability | PASS with nits | `config.shaft` holds all art and quality values, with GUI ranges. Shader numerics are identities or debug scales, except the drift-ratio nit. Contract §M6 matches the code. Disposal covers geometry, materials and the depth texture via its target. |
| Tests/build | PASS | `npm ci`; `npm test` 23/23; `npm run build` OK (603.42 kB, existing chunk-size warning). |

Environment: Windows 11, isolated Edge 155 (CDP 9333) with touch emulation, desktop GPU. Viewports 1440×900 DPR1, 390×844 DPR2 and 844×390 DPR2. No physical phone.

## Manual verification

1. Reload. Expected: a dim warm beam with faint drifting streaks crosses the upper-left frame onto the upper curtain and fades before the pool.
2. In `?debug`, step `shaft.view` through depth, segment, split and back. Expected: debug views without particles, then a normal frame.
3. Move `light.x`, `targetX` and `targetY`. Expected: the beam, the lit rock and the dust move together, with no hard lines where the beam meets the rock.
4. Touch inside the beam. Expected: parting and splashes unchanged.
5. **Phone, portrait and landscape:** expected a subdued beam and smooth motion. Report any stutter so the M9 preset can act.

## Gaps and next gate

Phone look and cost are UNVERIFIED. The motes nit needs a recorded disposition before M7 begins. Post-processing (M8) and the pool (M7) are expected future work. This approval applies only to `d02b197`.
