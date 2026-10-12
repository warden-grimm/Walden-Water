# M4 checkpoint review — revision 1

- Mode: CHECKPOINT (touch field, before water deformation)
- Base SHA: `a4b55164809c009fbb12b7d10929150ebc3ce3b0` (accepted M3)
- Reviewed head SHA: `458f0bd87b5d32efaa71788b275480e9d1cda748` (verified with `git rev-parse HEAD`)
- Review workspace: `claude-m4-checkpoint`, `C:/Users/Adam Tate/orca/workspaces/Walden-Water/claude-m4-checkpoint`
- Reviewer: Claude
- Verdict: **DRAFT FEEDBACK**
- Advancement: **not approved by checkpoint**

The architecture is sound. Projection, transport, decay, ping-pong separation, packed16 codec, validation and lifecycle all survived independent stress, and overlay contacts land within 0.5 CSS px of the pointer while the camera drifts. One acceptance-level interaction defect should be fixed before velocity drives deformation, foam or splashes. In `BASE..HEAD`, application code changed only in `458f0bd`. The M3 report, evidence and deploy commits do not touch `src/`.

## Blocking findings

1. `src/interaction/PointerTracker.js:212-217`: swipe strength depends on refresh rate, failing M4 check 3. Speed is the per-frame UV displacement divided by the frame delta. When frames arrive faster than pointer events (120/144 Hz display with 60 Hz input, or a 125 Hz mouse on 144 Hz), frames alternate between zero movement and a two-interval movement. Strength therefore alternates between `holdStrength` and a doubled velocity term. **Repro:** `probes/velocity.mjs` drives the real tracker with 60 Hz `pointermove` events at a constant finger speed. At 60 Hz frames, strength is a steady 0.936. At 120 and 144 Hz frames it alternates 0.85/1.00 (saturated). `tests/touch.test.js:74` sends exactly one move per frame, so it cannot catch this. **Fix:** derive velocity from event `timeStamp`s, or from distance over the elapsed time since the last frame that had movement, and carry it through empty frames. **Retest:** add a test with uneven input and frame rates. Sent early to the coordinator as `msg_487f06d47c10`. Due: before coupling, and no later than the final M4 review.

## Non-blocking findings

- **Byte-mode lateral residue never clears at high refresh rates** (`field.frag.glsl:27-28`). Per-step 16-bit rounding stalls once `|x|·(1−decay)` is smaller than half a count. A real-GPU harness at transport 0 left ±0.0011–0.0017 lateral force after 12 s in four cases: 165 or 240 Hz with recovery 3; 144 Hz with recovery 3 and threshold 0.0005; and **480 Hz with default settings**. Default settings at 360 Hz cleared, and half-float always cleared. In byte mode, force at least one LSB of decay per step, or raise the cutoff to the quantization floor. Owner: builder. Due: M4 final.
- **Terminal fallback kills the whole scene** (`TouchField.js:82`). Corrupting validation readbacks makes both paths fail. The page then shows "The 3D view could not start. Enable WebGL 2…", which is a misleading message. A restore that fails would throw from `resize`. Instead, disable touch with a logged reason and keep the water rendering. Owner: builder. Due: M4 final.
- **Same-frame re-press is dropped** (`PointerTracker.js:172`). A down/up/down of mouse id 1 within one frame hits the pending tap slot, so the whole second hold is ignored. Measured: count 0 even after moving. Nothing gets stuck, but the input is lost. Re-arm the pending slot instead. Owner: builder. Due: M4 final.
- **Cost attribution.** In-app GPU time is +2.0 ms both at 64×128 and at 512×1024 (64× the pixels). The isolated field pass is 0.02–0.08 ms. The delta is therefore a fixed overhead from the extra pass or render-target switch (ANGLE D3D11, or a timer artefact), not field shading. Do not describe it as "field work"; re-measure on phones. Owner: builder. Due: M4 final cost / M9.
- Half-float path is requested only via `EXT_color_buffer_float` (`TouchField.js:80`); also try `EXT_color_buffer_half_float`, since completeness and sampling are validated anyway. Owner: builder. Due: M9.
- **Resting-surface contact risk (advice).** Keep contact on the analytical rest ribbon and displace vertices by `sampleField(restUv)`. Never raycast the displaced mesh, because that forms a feedback loop. Parallax from z-push makes the visible bulge sit off-axis from the finger by about `dz·tan(view angle)`. Bound the toward-camera push, and add an evidence check that projects the displaced splat centre at corners. Show that it stays within a few pixels of the contact, or document the tolerance. Owner: builder. Due: M4 final.

## Evidence and rubric

| Category/check | Result | Command, observation, artifact, or reason |
| --- | --- | --- |
| Scope/spec | PASS | Field, overlay and debug inspection only; water unchanged apart from the overlay; no new dependency. |
| Shader/field | PASS (nit) | Advection centroid matches the analytic constant-acceleration path within 0.0005 v, at 60/144 Hz in both formats. No bottom/edge wrap. Ten overlapping maximum-strength pointers at 64×128 through 512×1024 stay finite and clamp to ±1. Read and write targets stay distinct. Neutral is exact, aside from the byte residue nit. |
| Interaction | **FAIL** | Overlay peak is within 0.5 CSS px of the pointer during drift at 7 desktop points, 5 portrait points (390×844 DPR 3, touch) and 1 landscape point, and after a resize while held. Two touches move independently. Cancel, hidden tab plus blur, and context loss leave 0 pointers. Refresh-dependent velocity is blocker 1. |
| Mobile/lifecycle | PASS desktop / UNVERIFIED phone | Byte and auto paths survive 2 restores and 3 rebuilds at 4 geometries, 3 textures and 4 programs, end neutral, and log no warnings or errors. Hiding the extension selects byte automatically. |
| Performance | PASS (trigger) | See timing table. Frame median/p95 are unchanged with the field on, off or in byte mode. No per-frame allocation in the tracker or field hot path (source review). |
| Visual intent | N/A | Deformation and foam not yet coupled. |
| Maintainability/deployment | PASS | `npm ci`: 0 vulnerabilities. `npm test`: 13/13 pass. `npm run build`: passes, with the existing >500 kB chunk warning. |

| 10 s warmup + 60 s, 1440×900, DPR 1, drift on, idle | Frames | Median / p95 ms | GPU median / p95 ms |
| --- | ---: | --- | --- |
| Field on (auto) | 3,394 | 17.6 / 18.3 | 3.164 / 4.377 |
| Field off | 3,398 | 17.6 / 18.3 | 1.170 / 3.640 |
| Field byte | 3,396 | 17.6 / 18.3 | 3.178 / 4.400 |
| Field 64×128 / 512×1024 | 3,396 / 3,392 | 17.6 / 18.4, 18.3 | 3.180 / 3.187 |

Environment: Windows 11, Edge 155.0.4283.45, ANGLE NVIDIA RTX A4500 D3D11. My checkout was served on strict port 5175, and an isolated Edge profile used CDP 9334. Desktop emulation is not phone evidence. Probes and outputs are in the scratchpad (`…\dd6e36b5-…\scratchpad\probes`, `…\out`): `gpu*.mjs`/`harness.js` (isolated renderer at fixed timesteps), `align.mjs`+`peak.py`, `life.mjs`, `repress.mjs`, `fallback.mjs`, `passcost*.mjs`, `velocity.mjs`, `measure.mjs`.

## Manual verification

1. On a 120 Hz phone, open `?debug` and enable the overlay. Make the same slow swipe with the browser at 60 and at 120 Hz: strength and trail width should match (currently they will not; see blocker 1).
2. With drift on, hold at the top, middle and corners: the green peak stays under the finger, and the tail flows downward.
3. Hold two fingers, lift one, then background the app: no obstacle remains, and the field reaches neutral within about 1.5 s of release.
4. Force byte mode, then restore the context and rebuild sizes: the log shows one line per path change, and the field reads neutral.
5. **Phone (mandatory at the final M4 gate):** real two-finger run and slow-motion latency observation, recording the tester, model, OS and browser.

## Gaps and next gate

Still UNVERIFIED: real multi-touch, phone latency, phone GPU cost and iOS/Android fallback selection. The user's iPhone 15 Pro Max report covers M3 rendering only. Vertex parting, foam and final-water clips are expected at M4 final. M4 final requires blocker 1 to be fixed and retested, the phone evidence, and a full exact-head review. This checkpoint approves nothing.
