# M6 early checkpoint: depth source and beam integration

`node docs/evidence/M6/checkpoint.mjs docs/evidence/M6/checkpoint/<view> <w> <h> <dpr>`
(Edge CDP 9333, preview 5174) for desktop 1440×900 DPR1, portrait 390×844 DPR2 and
landscape 844×390 DPR2. Each directory has these captures:

| File | Shows |
| --- | --- |
| `final.png` | Default shaft (intensity 0.05, core 2.5, 14 samples) |
| `view-depth.png` | Linear wall distance from the resolved MSAA `DepthTexture`, unprojected with the live camera inverse projection/world matrices; 25 m = white |
| `view-segment.png` | Length of the view-ray segment inside the shared cone, clipped at the wall; 6 m = white |
| `view-split.png` | Red = segment behind the curtain (drawn before the water), green = in front (drawn after) |
| `raised.png` | Intensity 0.6 to expose the depth fade and intersections |
| `raised-smooth.png` | Raised, with noise and streaks off |
| `shaft-off.png` | Shaft disabled, for comparison |
| `checkpoint.json` | Snapshot of the run, including any console warnings/errors |

No console warnings/errors occurred in any view (an ANGLE "potentially uninitialized" warning
from early returns in `coneInterval` was removed before these captures).
The brighter step at the curtain's left/right edges at raised intensity is the
pre-existing M2 wet-rock sheen confined to the curtain footprint. With the
curtain hidden, the shaft-only profile across the edge is identical
(builder's isolation run).
