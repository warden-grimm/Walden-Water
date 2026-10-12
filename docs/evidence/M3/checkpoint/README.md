# M3 early checkpoint

This is the pre-polish flow/transparency/refraction checkpoint, not final M3 acceptance.

- `node docs/evidence/M3/checkpoint.mjs` drives the builder checkout on strict port 5174 through a dedicated Edge CDP session at 9333. Edge 155, Windows, RTX A4500, 1440×900, DPR1. Reviewers must adapt their URL and CDP port to their own checkout/browser.
- `flow.webm`: ten seconds of travel-time bands. Down is decreasing v; separation and speed increase toward the bottom. Mathematical direction/acceleration and both-quality UV raycasts are additionally checked by `npm test`.
- `wall-only.png` vs `zero-offset.png`: static camera, stationary wet shader, markers hidden; refraction inspection with zero offset is pixel-identical to no curtain (Pillow ImageChops difference extrema all zero). This verifies sample coordinates and one color conversion. `offset.png` differs only within the ribbon region (bounds 545,75–895,825 at this viewport).
- `uv.png`: red increases left-to-right, green bottom-to-top. The curve lives in CPU mesh vertices; no hidden shader displacement.
- `checks.json`: browser snapshot, isolated native GPU state proof on a second temporary renderer, GL error 0, no shader/compiler/browser errors or warnings. The state proof checks an existing destination with custom viewport/scissor and autoClear=false, then deliberately throws during capture to verify finally restoration.
- `draft.png` is an earlier unpolished default render. Final art, full orientation clips, lifecycle sweep and matched performance comparison follow the checkpoint.

The wall draws once into a validated linear target. A fullscreen background and one front-facing transparent sheet sample it after capture. The source scene holds only `wall`; its material has no target sampler. Native proof disposes its temporary renderer and target. Byte mode deliberately clips HDR wall values; it is an explicit LDR fallback, not a simulation encoding.

Known work before final review: reassess M2 noise/shelf art under water, bound wet mask vertically, tune curtain/glints/markers, full 60-second cost and reduced quality comparison, orientation recordings and lifecycle evidence. Physical-phone testers remain unconfirmed; they are required at M4, not this checkpoint.
