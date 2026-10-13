# M5 evidence: droplets, spray, dust and mist

Environment: Windows 11, isolated native Edge 155 (CDP 9333, dedicated profile,
occlusion backgrounding disabled), desktop GPU. Candidate preview
`npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`; M4 baseline is a
detached worktree of `f98a80d` (application source identical to accepted
`86f9fd5`) served on 5175. Edge touch emulation, **not** physical-phone evidence.

## Behaviour probe (`probe.mjs`)

`node docs/evidence/M5/probe.mjs docs/evidence/M5/<dir> <width> <height> <dpr>`
was run for `desktop` (1440×900 DPR1), `portrait` (390×844 DPR2) and
`landscape` (844×390 DPR2). Each directory has:

- `idle.png`: continuous lip spray (top edge), base spray (impact line), dust
  and faint mist only inside the upper-left shaft.
- `swipe.webm`, `swipe-250ms.png`, `swipe-750ms.png`: a fast left-to-right
  swipe (~0.13 s) throws droplets rightward and toward the camera; they arc
  down under gravity and retire. Clip cadence is 30 fps capture, not perf data.
- `held.png`: a finger held three seconds keeps the parted opening; it emitted
  exactly **one** press burst and no further bursts (`probe.json` steps).
- `light-moved.png`: shared light moved right (x −3.5→−1.5, targetX 0→1.5).
  Dust, mist and droplet sparkle follow the mask; the old beam region is dark.
- `after-context-restore.png`: forced context loss/restore, then a new swipe.
  Bursts resume; `restores=1`, running.

| View | Swipe bursts | Held 3 s (total) | Live 2 s after release | After restore | Console warnings/errors |
| --- | --- | --- | --- | --- | --- |
| Desktop | 9 | 10 (+1 press) | 0 | +9, running | 0 |
| Portrait | 7 | 8 (+1 press) | 0 | +9, running | 0 |
| Landscape | 4 | 5 (+1 press) | 0 | +5, running | 0 |

Landscape crosses less of the curtain in the same screen fraction, so fewer bursts.

## Matched timing (`measure.mjs`)

Copy of the M4 matched-run script; idle/interaction scripts unchanged, plus a
four-finger fast-swipe `stress` mode. 1440×900, DPR1, 10 s warmup + 60 s.
Order was M4 idle, M5 idle, M4 interaction, M5 interaction, M5 stress, then a
second pass M5 interaction, M4 interaction, M5 stress.

| Run | Frames | Median / p95 ms | GPU median / p95 ms |
| --- | --- | --- | --- |
| m4-idle | 3572 | 16.7 / 16.8 | 3.243 / 4.549 |
| m5-idle | 3600 | 16.7 / 16.8 | 3.336 / 5.308 |
| m4-interaction | 3600 | 16.7 / 16.8 | 3.496 / 5.009 |
| m5-interaction | 3393 | 17.6 / 18.1 | 3.423 / 5.152 |
| m5-stress | 3407 | 17.5 / 18.1 | 3.395 / 5.226 |
| m5-interaction-r2 | 3600 | 16.7 / 16.8 | 3.298 / 4.978 |
| m4-interaction-r2 | 3600 | 16.7 / 16.8 | 3.323 / 4.913 |
| m5-stress-r2 | 3600 | 16.7 / 16.8 | 3.285 / 4.750 |

**Disposition.** Matched idle and the second interaction pair show no frame
median/p95 change, so the >10% trigger does not fire. The first m5-interaction
and m5-stress runs show +5.4% median / +7.7% p95 (below the trigger) with only
~3400 frames and a *lower* GPU median than M4: the display/compositor ran at
~57 Hz for those two consecutive minutes (the same 17.6/18.1 pattern appears in
earlier M4 runs, e.g. `../M4/final-cost-summary.json`). The immediate rerun of
both builds at 60 Hz matches exactly. GPU cost added by particles is within
run-to-run noise here (≈0.0–0.1 ms median). The first `m5-stress` run exited 1
only because its end check expected four curtain contacts while fingers sweep
partly off the curtain; the script now checks four held pointers, and r2 passes.

Pipeline: draws 4 → 7 (three additive `Points`), programs 4 → 7, textures 3 → 4
(the 96×2 RGBA32F burst ring, 3 KB), triangles unchanged at 227,076. Points:
720 spray + 3072 burst capacity + 1236 motes = 5028 vertices, most retired
(zero-size, off-clip) at any moment. Stress (four fingers, ~1300 px/s, 60 s):
3241 bursts emitted, at most 71/96 slots live, 0 overwritten, ring size fixed.

Desktop vsync-limited timing cannot certify phone frame rate; mist sprite
overdraw (36 sprites up to a few hundred px) is the main fill-rate risk to
watch on phones and is reducible via `dust.mistCount`/`mistSize`.

## User follow-up: splash rim origin and dimmer dust

After acceptance, the user asked for two changes before publication. (1) Touch
splashes should come from the upstream perimeter of the touch, bouncing off it,
not from its centre. (2) Dust should be dimmer and closer to the stone colour,
so it no longer resembles water spray. The `desktop/`, `portrait/` and
`landscape/` probe captures above were regenerated at the new head; their
counts are unchanged and there are no console warnings/errors.

`splash-rim/` (`node docs/evidence/M5/splash-rim/shots.mjs docs/evidence/M5/splash-rim`,
390×844 DPR2, drift off) has full frames and `*-crop.png` close-ups.
`press-120ms`/`press-270ms` show the press splash leaving the **upper rim of the
opening** and arcing out and down in front of the sheet. `drag` shows a
down-right drag shedding droplets from the leading upstream edge. At rim 1
(the field sigma), droplets started inside the dark opening; rim 2 matches its
visible edge. Dust is now grey `#6b6a64` × 0.9 instead of warm light × 2.6;
lip spray specks stay bright because they are water.
