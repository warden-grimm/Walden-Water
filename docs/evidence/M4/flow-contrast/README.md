# M4: slightly faster flow and a little more contrast

User request: "Increase the speed of the water slightly and add just a little more contrast."

| Setting | Previous live value | New value |
| --- | --- | --- |
| Water flow speed | 1 | 1.15 (+15%) |
| Rock color | `#4b555e` | `#48525b` |
| Curtain color | `#9cbdc6` | `#a6c6ce` |
| Curtain opacity | 0.40 | 0.43 |

Only these four existing GUI tunables change in the application. Shared `flowSpeed` drives both the visible streak phase and field advection; acceleration toward the bottom remains. Touch injection, decay, lighting, wet highlights, geometry, shaders and render cost structure are unchanged.

Reproduce with isolated Edge CDP9333, `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`, then:

```sh
node docs/evidence/M4/contrast-verify.mjs ./flow-contrast-preset.json
```

The reusable probe now accepts a preset/output directory, asserts loaded defaults, and counts delivered DOM touch events. It retains the old comparison when run without a preset. An initial probe attempt had an unclosed JavaScript expression in the new DOM-counter setup; fixed before this successful evidence capture. That attempt generated no usable result and is not application evidence.

- `*-before.png` / `*-after.png`: matched static frames with water/wet flow and camera drift frozen, comparing this revision against the preceding live contrast settings. Rock detail remains visible through stronger water streaks, and off-beam water stays dim.
- `*-before.webm` / `*-after.webm`: four-second motion clips in portrait and landscape, camera drift disabled for comparison, old flow 1 versus new flow 1.15. These show actual rendering; the requested recording cadence is 30 fps and is not performance evidence.
- `*-touch-*.png` and `smoke.json`: at the new defaults, two simultaneous contacts held for three seconds, then released. Auto in portrait (390×844 CSS) and forced byte in landscape (844×390), DPR2. Both deliver two DOM pointerdowns/up, maintain pressure >0.8, and return to zero contacts/exact neutral by 2.2 seconds after release. No browser warnings/errors.

Windows Edge emulation, not physical-phone evidence. Existing user feedback remains positive Chrome on iOS with no lag/bugs; no additional phone checklist response is supplied by this request. No M5 advancement. The four uniform-value changes add no passes, geometry, allocations or dependencies; existing M4 pipeline performance measurements remain the comparison baseline.
