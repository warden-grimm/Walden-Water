# M3 checkpoint review — revision 1

- Mode: CHECKPOINT
- Base SHA: `0354151a78de0eaa228d58591d3618aa43358c51`
- Reviewed head SHA: `a06955aaf217855e3e33f5c77231fe17845e48f9` (verified with `git rev-parse HEAD`; reviewed `git diff BASE..HEAD`)
- Review workspace: Orca child worktree `claude-m3-checkpoint`, `C:\Users\Adam Tate\orca\workspaces\Walden-Water\claude-m3-checkpoint` (branch `claude-m3-checkpoint`)
- Reviewer: Claude
- Verdict: DRAFT FEEDBACK
- Advancement: not approved by checkpoint

Draft feedback does not approve M3. Final art, matched cost, orientation clips and the lifecycle sweep are deliberately pending and are not required here.

## Blocking findings

None. The architecture is sound to polish on. Flow direction and acceleration, the CPU-curved UV contract, the isolated wall-only source, pass order, renderer-state restoration, and a single ACES/sRGB conversion were all independently verified (see the evidence below).

## Non-blocking findings (due before final M3 unless stated)

1. **Byte fallback posterizes the entire wall, not just refraction.** `src/scene/WallCapture.js:35,44`. The background is now drawn from the capture, so storing linear RGBA8 quantizes the dark rock. On my checkout, forced `byte` cut 1440×900 wall-only unique colors from 6,436 to 1,744. The max error is only 3/255 vs. the direct render (HDR clipping is negligible at defaults), but contour banding shows when the image is brightened ×6 (`byte-banding-x6.png`). Before M3, the wall drew directly and had no such loss. Smallest fix: make the byte target `SRGBColorSpace` (WebGL2 SRGB8_ALPHA8, which decodes in hardware), or draw the wall directly in byte mode. Retest the banding crop and the zero-offset identity. Owner: builder.
2. **Every context restore logs 3 WebGL warnings.** `WallCapture.js:46` disposes the pre-loss target after restore. Three's stale dispose listener then calls `deleteFramebuffer`, `deleteRenderbuffer` and `deleteTexture` on objects from the lost context, giving "INVALID_OPERATION: delete: object does not belong to this context". Traced by stack. This is new to M3 and is separate from the accepted HMR-after-restore nit. It's harmless but pollutes the console. Fix: drop the stale target reference on restore instead of disposing it, or document it as accepted. Owner: builder; due in the M3 lifecycle sweep.
3. **Markers draw before the curtain.** Draw order is wall@capture → background → lip → pool → curtain, even though the markers sit at z=0.01, in front of the curtain edges (`WaterCurtain.js:35` renderOrder 1 vs. markers 0). The markers are temporary, but give them renderOrder 2 or remove them. Owner: builder.
4. **`refraction.scale` resamples the whole background.** At 0.5, the full-frame max difference is 89/255, not just the curtain's. Rename it or document it as a wall-resolution knob, and include it in cost review. Owner: builder.
5. **Wall lost MSAA.** The capture target has `samples: 0`, while M2 drew the wall to the antialiased canvas. Visual impact is UNVERIFIED. Compare ledge silhouettes and consider `samples` if visible.
6. **Shader nits.** `water.frag.glsl:16-18`: noise differences are not divided by `2*normalStep`, so changing the step also changes normal strength. u/v are anisotropic (2.8 m × 6 m). `waterTravel` relies on the config minimum (lipSpeed ≥ 0.1, `water-common.glsl:8`); consider a shader `max()` guard. Long uptime increases the `hash21` inputs (phase × 456); wrap time or verify noise quality after hours (due M9).
7. **Art (expected polish).** At defaults, the upper curtain reads as a fairly uniform milky rectangle with hard vertical sides and a straight top, especially in portrait (`life-portrait.png`). Edge tearing mostly appears in the lower third. Tune toward the goal's "barely visible outside the beam" before the final review.

## Evidence and rubric

| Category/check | Result | Evidence |
| --- | --- | --- |
| Scope/spec | PASS | Diff is limited to the M3 curtain, capture, debug views and scoped M2 nits. No touch work. Wall-as-background deviation is documented in `scene-contract.md`. |
| Flow: constant phase moves down and accelerates | PASS | Rendered flow-band peaks in an isolated renderer moved toward lower v over 0.03 s: 5 px near v≈0.45 vs. 1 px near v≈0.89. `npm test` checks the travel-time inverse. `flow.webm` (9.97 s, 300 frames) shows bands widening downward. |
| Curved geometry UVs / M4 mapping | PASS | Curve lives in CPU vertices with translation only; normals derived analytically (checked by hand). UV view shows red left→right and green bottom→top. Raycast test passes at both qualities. Bottom-up v with negative-v transport is documented. |
| Wall-only source / no feedback | PASS | Draw log: `wall@capture` is the only capture draw; background, curtain and markers draw to the screen. `sourceObjects:["wall"]`. `render()` throws when the active target is the capture (unit test). |
| Transparent ordering | PASS (nit 3) | Background (opaque, renderOrder −1, no depth test) → transparent markers → curtain (premultiplied ONE/ONE_MINUS_SRC_ALPHA, depthWrite off, FrontSide). Wall z ≤ −0.6, so the missing wall depth test cannot cause intersections. |
| Renderer state incl. throw path | PASS | Builder's native proof plus unit test re-reviewed. My probe: exposure, clear color/alpha, output color space, tone mapping and null target all unchanged after a capture. |
| One linear→ACES/sRGB conversion | PASS | Composite (curtain hidden) vs. the wall drawn directly to the canvas: max 1/255 (half float). Three r186 skips tone mapping offscreen (`WebGLPrograms.js:181`). |
| Zero-offset identity | PASS | Reproduced: my `wall-only` vs `zero-offset` difference is 0. Builder PNGs are md5-identical. Offset changes are confined to x 545–894, y 75–824. |
| NaN at extremes | PASS | Float-target readback with min lipSpeed (0.1), max normalStep (0.02), gravity 0/5, max normalStrength/glint and min gloss: 0 NaN, 0 Inf, GL error 0. |
| Byte/HDR fallback | PASS (functional), nit 1 | Forced byte gives RGBA8 and survives a runtime switch and a context cycle. Max error 3/255; wall is visibly posterized when brightened. |
| Resize/disposal | PASS | Capture tracks the buffer: 780×1688 portrait, 1688×780 landscape, 2880×1800 at DPR2. Generation increments only on change. Replaced geometry/targets disposed (tests and source). HMR: UNVERIFIED (pending sweep). |
| Context restore | PASS (nit 2) | 3 lose/restore cycles: format reselected, frames resume, pre/post screenshots max diff 1. |
| Performance | UNVERIFIED (final) | 1440×900 DPR1, Edge 155 / RTX A4500, 10 s warmup + 60 s: frame median 16.7 / p95 16.8 ms (baseline 16.7/16.8). GPU median 0.95 ms vs. 0.50 baseline, p95 3.39 vs 4.68. 5 draws, 227,078 tris. Reduced-wall run identical. Phone cost not measured. |
| Visual intent | UNVERIFIED (pending polish) | See nit 7. Glints are localized in the beam and the rock stays visible. |
| Maintainability | PASS | Tunables in `config.js`/GUI with rebuild labels; commented standalone GLSL; shared time/light uniforms. |
| Interaction | N/A (M4) | — |

Commands: `npm ci` (exit 0), `npm test` (10/10 pass), `npm run build` (pass; existing >500 kB chunk warning), `npm run dev -- --host 127.0.0.1 --port 5175 --strictPort` serving this checkout. Native Edge 155.0.4283.45 used a dedicated profile with CDP on 9334, launched with occlusion backgrounding disabled; the first launch reported `document.hidden` and did not render. Emulated 390×844 and 844×390 at DPR3 (capped at 2). Desktop GPU only; no physical phone.

Temporary probe files (untracked, outside the repo): `C:\Users\ADAMTA~1\AppData\Local\Temp\claude\C--Users-Adam-Tate-orca-workspaces-Walden-Water-claude-m3-checkpoint\edd4cba7-3be0-47b2-9d10-b4d35740d3f9\scratchpad\` (`live.mjs`, `inpage.mjs`, `byte.mjs`, `switch.mjs`, `life.mjs`, `stale.mjs`, `measure.mjs`, `out/*.png|json`). Logs: `..\m3cp-{npmci,test,build,dev}.log` next to the worktree. Edge profile: `C:\Users\ADAMTA~1\AppData\Local\Temp\claude\m3cp-edge-profile`.

## Manual verification

1. `?debug`, water view "flow bands": bands move down and widen toward the pool.
2. Hide the curtain, then switch to view "refraction" with strength 0: the image is identical. Raise strength: only the ribbon region changes.
3. Set refraction precision to `byte` and brighten the screenshot: compare banding against `auto` (nit 1).
4. Lose and restore context 3 times: rendering resumes. Note the console warnings (nit 2).
5. Portrait/landscape emulation: the capture size snapshot equals the buffer.
6. Phone: not required at this checkpoint. A physical iPhone/Android check of fallback format and cost is still due by M4.

## Gaps and next gate

Pending for the final M3 review: art polish (nit 7 and the M2 wet-mask/noise nits), matched 60 s cost including reduced curtain and GPU deltas, 10 s portrait/landscape clips, a refraction on/off clip, HMR/lifecycle sweep, and nits 1–6 resolved or documented. This feedback applies only to `a06955a` and does not permit M4.
