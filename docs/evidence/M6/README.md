# M6 evidence: volumetric light shaft

Environment: Windows 11, isolated Edge 155 (CDP 9333), desktop GPU; candidate
preview 5174 (`--strictPort`), accepted M5 baseline worktree `900eb96` on 5175.
Edge emulation, not physical-phone evidence.

- [`checkpoint/`](checkpoint/README.md): early depth checkpoint (debug views, raised intensity),
  reviewed as [r1](../../reviews/M6-checkpoint-r1.md) / [r2](../../reviews/M6-checkpoint-r2.md).
- `seam.mjs` → `seam/`: r1 blocker retest. Shaft only, black scene, curtain hidden;
  smooth profiles across the curtain's left edge and lip at 0.05/0.15/0.6.
- `final.mjs` → `final/{desktop,portrait,landscape}/`: `default.png`; `beam.webm`
  (6 s, slow streak/haze drift; capture cadence, not perf); `shaft-off.png`;
  `light-moved.png` (source x −1.5, target (1.2, 2.5): the beam meets the
  rock softly, with real occlusion and no hard lines); `touch-in-beam.png`.
  `final.json` records touch available, bursts emitted, exact-neutral field after release,
  9 draws, and no console warnings/errors in any view.
- `hmr.mjs` → `hmr.json`: 3 HMR cycles each on `main.js`, `createScene.js`,
  `Particles.js` and `LightShaft.js`, auto and byte (24 rows). Touch remains valid,
  splashes still fire, geometries/textures/programs stay at 8/5/8, one canvas and
  one GUI, no console warnings/errors.

## Matched timing (`measure.mjs`, 1440×900 DPR1, 10 s warmup + 60 s)

| Run | Frames | Median / p95 ms | GPU median / p95 ms |
| --- | --- | --- | --- |
| m5-idle | 3383 | 17.8 / 18.1 | 3.560 / 5.300 |
| m6-idle (4-octave haze) | 3383 | 17.8 / 18.1 | 4.431 / 7.168 |
| m6-idle-shaftoff | 3391 | 17.7 / 18.1 | 3.573 / 5.401 |
| m5-interaction | 3384 | 17.8 / 18.1 | 3.552 / 5.354 |
| m6-interaction (4-octave) | 3382 | 17.8 / 18.1 | 4.505 / 7.146 |
| m6-stress (4-octave) | 3391 | 17.6 / 18.1 | 4.460 / 7.112 |
| **m6-idle-2oct (submitted)** | 3388 | 17.7 / 18.4 | **4.194 / 6.780** |

The display ran at ~57 Hz in this session; both builds were measured under the
same conditions. Frame median/p95 change ≤ +1.7%, so the trigger does not fire.
With the shaft disabled, M6 equals M5 GPU cost. The shaft's two fullscreen
passes cost ≈0.87 ms GPU median with four-octave haze. Reducing the haze to two
octaves (visually equivalent broad variation) brought it to ≈0.63 ms (−27%).
Pipeline: draws 7 → 9, programs 7 → 8, textures 4 → 5 (the resolved wall
`DepthTexture`), triangles +4 (two fullscreen quads).

**Phone risk.** Shading is per pixel over the cone's screen area. A DPR2
phone (780×1688) shades about as many pixels as this desktop test, on a much
weaker GPU. Levers: `shaft.samples` (14, linear cost), `shaft.enabled`, and
a future half-resolution beam target. Preset choice is owned by M9 with real
phone timing; the user's phone feedback is requested.
