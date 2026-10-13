# M5 review — revision 3

- Mode: MILESTONE (focused re-review of the user's visual follow-up)
- Base SHA: `86f9fd594e98719b8b0f059e4267c0c29cdad09a`
- Previous accepted head: `e2ed56dc0d19a977454fa725e180f4a68e31c8b0` (r2: APPROVE WITH NITS)
- Reviewed head SHA: `900eb9648d58cb68ad735915c9561f454c87aaff` (`git rev-parse HEAD` verified)
- Review workspace: `scratchpad/m5-review`; preview at `http://127.0.0.1:5176/` (`--strictPort`)
- Reviewer: Claude
- Verdict: **APPROVE WITH NITS**
- Advancement: permitted (publication and M6). Phone look remains UNVERIFIED.

## Blocking findings

None.

## Non-blocking findings

- **Origin can sit above the lip.** The rim offset is purely +y/sideways in world xy, so a press within about 0.26 m of the lip starts droplets above the water (y > height). Clamp `origin.y` to `uHeight`, or shrink the arc near the lip. Owner: builder. Due: M7, alongside impact rings.
- **One seed drives three jitters.** `aSeed.y` now jitters the bounce, the lifetime and the y spread together. This is harmless, but those draws are correlated; use an independent seed if it ever looks patterned. Owner: builder. Due: M9.
- **Prior nits keep their owners and dates.** These are the M8 HMR-after-restore warnings, the M9 ring saturation and shader constants, the M6 mote attenuation, and the speed-vs-count judgement.

## Evidence and rubric

| Category/check | Result | Command, observation, artifact |
| --- | --- | --- |
| Scope/spec | PASS | The delta covers only the burst origin and bounce, the dust colour and brightness, the new config/GUI keys, and the contract text. Emitter CPU logic, counts, passes and textures are unchanged. |
| Press splash from upper rim | PASS | 390×844 DPR2, press-and-hold at (195, 350), frames at 0/60/180/480 ms (`out-r3/press-*.png`). At 60 ms droplets form an arc on the upper rim of the dark opening, not inside it. Then they fall, carried by the flow. Isolated run (curtain hidden): droplet centroid at 50 ms is 19.6 CSS px **above** the contact, with no energy below it. The expected rim distance is 0.13 × 2 = 0.26 m, about 24 px. |
| Swipes directional | PASS | A fast right swipe throws droplets to the right and toward the camera (`swipe-right-250ms.png`). The swipe velocity term is unchanged; the bounce only adds a radial component. |
| Dust subtler but present | PASS | Isolated dust on a blacked-out rock, 99th-percentile brightness of lit pixels: r3 78, r2-equivalent settings 196, lip spray alone 117. Its tone is neutral grey-stone. About 7.8k lit pixels remain in the beam; the idle frame still shows motes only in the upper-left beam. |
| Tests/build | PASS | `npm ci` OK, `npm test` 23/23, `npm run build` OK (593.99 kB, existing chunk-size warning). The probe run had no console warnings or errors. |
| M7 contract vs shader | PASS | The contract's origin, velocity and `radial` match `burst.vert.glsl`. `impactTime` now uses `origin.y`, as documented. `touch.radius` is in metres, the same as the field (`field.frag.glsl:47`). |
| GUI tunables | PASS | `bursts.rim`, `arcRadians` and `bounce`, plus `dust.color` and `brightness`, are in `config.js` with their ranges and bound as uniforms. No new constants were added to the shaders. |
| Phone | UNVERIFIED | Desktop Edge with touch emulation only. |

Environment: Windows 11, Edge 155 via CDP 9333, touch emulation, 390×844 at DPR2. Scripts and outputs are in `review-scratch/` (`r3.mjs`, `dust.mjs`, `out-r3/`), untracked.

## Manual verification

1. Press and hold the upper curtain. Expected: a small arc of droplets leaves the top edge of the opening and falls past the finger. **Phone.**
2. Swipe fast sideways. Expected: droplets are thrown along the swipe and toward the viewer.
3. Watch the beam while idle. Expected: dim stone-grey motes are visible only in the beam and are clearly fainter than droplet glints. **Phone.**

## Gaps and next gate

Phone visual confirmation is pending with the user. This approval applies to `900eb96` within M5 scope only.
