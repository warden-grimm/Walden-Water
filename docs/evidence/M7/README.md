# M7 evidence: pool, impact rings, low mist

Environment: Windows 11, isolated native Edge (CDP 9333, dedicated profile),
desktop GPU. Candidate `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`.
The M6 baseline is a detached worktree of accepted `d02b197`, served on 5175.
This is Edge touch emulation, **not** physical-phone evidence. Contract:
[scene-contract § M7](../../scene-contract.md#m7-pool).

## Behaviour probe (`probe.mjs`)

`node docs/evidence/M7/probe.mjs docs/evidence/M7/<dir> <width> <height> <dpr>`
was run for `portrait` (390×844 DPR2), `landscape` (844×390 DPR2) and
`desktop` (1440×900 DPR1), with drift off. Each directory has:

- `idle.png`: the dark pool below the curtain. It shows the impact churn and
  foam line, rippled reflections of the curtain's lower strands and the rock,
  and faint low mist. The beam stays the focal point.
- `view-ripples.png`, `view-normals.png`, `view-reflection.png`: pool debug
  views. The reflection view shows the mirrored rock continuing from the real
  rock at the waterline, plus the mirrored curtain strands.
- `swipe-pool-*ms.png` and `swipe-ripples-*ms.png`: a fast swipe low on the
  curtain, captured 300/600/900/1300/2000 ms later in the final view and the
  ripple-target view. Droplets arc right and down. Rings appear on the pool
  where they land (to the right of the swipe, in front of the sheet), expand,
  and are gone by about 2 s. Captures are separate runs of the same script,
  not the same droplets.
- `pool-off.png`: pool and mist disabled. The scene below the waterline is M6's.
- `light-low.png`: the shared light aimed low (targetY 1.2). The beam, rock,
  water, pool body/foam and low mist are lit together.
- `byte-idle.png`, `byte-ripples.png`: `pool.precision = 'byte'` (RGBA8 path).
- `after-context-restore.png`: forced context loss/restore, then a new swipe
  (`restored-pool-*`).
- `probe.json`: per-step snapshots (ripple target size/format, ring source
  counts, draws, triangles, geometries, textures, programs), log lines and
  console warnings/errors.

| View | Swipe splashes | Ripple target | Byte path | After restore | Console warnings/errors |
| --- | --- | --- | --- | --- | --- |
| Portrait | 7 / 8 | RGBA16F 576×384 | RGBA8 576×384 | target reallocated, +7 splashes | 0 |
| Landscape | 4 / 4 | RGBA16F 576×384 | RGBA8 576×384 | target reallocated, +4 | 0 |
| Desktop | 5 / 5 | RGBA16F 576×384 | RGBA8 576×384 | target reallocated, +5 | 0 |

Rebuild controls (`impactRings` 80, `rippleResolution` 64 → 384×256 target,
`mist.count` 60) and a return to defaults leave geometries/textures/programs at
11/6/13, the same as at the start. Draws go from 9 (M6) to 14: three ring
splat draws into the ripple target, the pool, and the low mist. Triangles go
from 227,080 to 227,082 (the pool quad). Textures go from 5 to 6 (the ripple
target), geometries from 8 to 11 and programs from 8 to 13 (idle timing
snapshots).

`reflectivity-landscape.png` (landscape, lower half, center crop) stacks
three views: the reflection-only debug view, then `reflectivity` 1.0, then 2.0.
At the physical value 1.0 the pool reads as a black band under the rock. At
2.0 it reads as a dark mirror that continues the rock. The default 1.8 is that
artistic choice. A first version intersected a flat wall plane; recessed rock
behind it put submerged rock in the reflection near the waterline. The
reflection now marches through the rock depth range instead.

## HMR (`hmr.mjs`, `hmr.json`)

Each of `main.js`, `createScene.js`, `Particles.js` and `Pool.js` was rewritten
with identical bytes three times, in touch `auto` and `byte` modes: 24 cycles.
Every cycle kept the touch field available, the RGBA16F ripple target
allocated, and one canvas and one GUI. A swipe after each cycle splashed.
Geometries/textures/programs stayed at 11/6/13, with 0 console warnings/errors.

## Matched timing (`measure.mjs`)

This is M6's script with a `pooloff` modifier (pool and mist disabled).
1440×900, DPR1, 10 s warmup + 60 s, alternating baseline/candidate. The display
ran at about 57 Hz for this whole session; both builds show the same frame
numbers, so the pairs are matched.

| Run | Frames | Median / p95 ms | GPU median / p95 ms |
| --- | --- | --- | --- |
| m6-idle | 3381 | 17.7 / 18.3 | 4.568 / 7.302 |
| m7-idle | 3382 | 17.7 / 18.3 | 4.584 / 7.734 |
| m6-interaction | 3389 | 17.7 / 18.3 | 4.457 / 7.118 |
| m7-interaction | 3385 | 17.7 / 18.4 | 4.677 / 7.866 |
| m6-stress | 3384 | 17.7 / 18.4 | 4.477 / 7.209 |
| m7-stress | 3387 | 17.7 / 18.3 | 4.586 / 7.682 |
| m7-idle-pooloff | 3390 | 17.7 / 18.4 | 4.465 / 7.121 |

**Disposition.** Frame median/p95 are unchanged (≤ +0.5%), so the >10% trigger
does not fire. M7 adds about 0.02–0.22 ms GPU median and 0.4–0.75 ms p95 on
this desktop. Disabling the pool and mist returns to the M6 cost. The
four-finger stress run (fast swipes, many landing rings) costs no more than
interaction. Cost per pool pixel: about 10 texture reads (4 ripple taps + 1
foam, 1 wall depth, up to 6 reflection depth reads + 1 capture read) and
~11 noise evaluations, including the curtain reflection's water noise where it
applies. On phones, the pool covers about 10–15% of the portrait frame. The
levers are `pool.reflectionSteps`, `rippleResolution` and `mist.count`/`size`,
owned by the M9 presets.
