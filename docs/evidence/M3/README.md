# M3 evidence

See `../../reviews/M3-checkpoint-r1.md` for Claude's independent early review of
`a06955a`: **DRAFT FEEDBACK**, no blockers. `checkpoint/` and `claude-checkpoint/`
are historical draft evidence, preserved unchanged. `final/` is the polished
submission. Final milestone approval is separate from the checkpoint.

Claude's [final review](../../reviews/M3-review-r1.md) approved implementation
`a4b55164809c009fbb12b7d10929150ebc3ce3b0` with nits and no blockers.
[Independent final evidence and provenance](claude-final/ARCHIVE.md) are
preserved alongside the builder's captures below.

## Reproduce

Run `npm ci`, `npm test`, `npm run build`, then
`npm run dev -- --host 127.0.0.1 --port 5174 --strictPort` in the builder checkout.
The reviewer must use its separate checkout and strict port 5175.
Native Edge 155 / Windows / NVIDIA RTX A4500 (ANGLE D3D11) was used with a
dedicated profile and CDP on 9333, occlusion backgrounding disabled. Scripts
use Node 24's built-in WebSocket; no test dependency was added.

- `verify.mjs` captures visuals and verifies resize, DPR, rebuilds, native
  visibility, reduced motion, context restoration and HMR. It temporarily appends
  comments to `src/main.js` for HMR, then restores the original bytes. Run only
  in the intended checkout with no concurrent source editor or performance run.
- `measure.mjs <reference|curtain-reduced|half-wall|no-water>` runs the fixed
  10s warmup +60s sample at 1440×900, DPR1, GUI hidden, default camera drift,
  idle water and no interaction. Settings/viewport interruptions invalidate the
  run and return a failing exit code. Runs must be sequential.
- `baseline-timing.json` is accepted M2 application code freshly measured before
  M3 edits (HEAD79be814, application identical to accepted0354151).
  `reference-timing.json` is the completed default run also saved under
  `resize-investigation-timing.json`. Two earlier `*-cancelled.json` files are
  invalid attempts, not performance evidence. Their resize-trigger source was
  not determined; the completed replacement has no sampling-period resize.

## Visual evidence

- `final/portrait.webm`: 390×844 CSS, reported DPR3 capped to drawing DPR2,
  780×1688 canvas; duration10.124s. The PNG is a browser screenshot at device
  scale3 and is larger than the canvas buffer.
- `final/landscape.webm`: 844×390 CSS at DPR2, 1688×780 canvas; duration10.184s.
- `final/refraction-toggle.webm`: fixed camera/flow, first roughly5s refraction
  on, remainder off. `refraction-on/off.png` are matched stills. Changes above
  1/255 are confined inside the ribbon (558,192–874,722). Tiny 1/255 compositor
  differences elsewhere are not attributed to refraction.
- `desktop.png`, `ultrawide.png`, `light-default/moved.png`, `wet-mask.png` show
  framing, shared light response and vertically bounded wetness. No phone GPU
  or physical touch claim is made from emulation.
- `reference.png` vs `curtain-reduced.png`: 120×400 vs60×200, max1/255 difference
  in this simple static bow. Both use identical fragment shading. Future M4
  field deformation may expose a larger fidelity difference.
- `wall-msaa4/0.png`: target multisampling comparison. Max10/255, about1.1% of
  pixels change; improvement is concentrated at geometry edges. Softer shelf
  defaults also reduce the M2 stepped-rim appearance.
- `wall-auto/byte.png`: half-float vsSRGB8_ALPHA8, max2/255, 5,843 vs4,053 unique
  colors. Hardware sRGB storage preserves dark detail better than the draft's
  linear byte target. Byte still clips HDR values above1. `zero-auto/byte.png`
  each exactly match their wall-only counterpart, verifying screen mapping and
  one output color conversion in both modes.
- `image-comparisons.json` records numerical comparisons. `checks.json` records
  exact environment, counts, lifecycle observations and console entries.

## Cost and known limits

The frame gate uses median **or** p95 increase greater than10% against baseline.
GPU timing supplements this refresh-limited metric and is not interchangeable
with CPU submission time. The complete timing table/disposition is in
`REVIEW_NOTES.md`. Thermal/clocks/background activity were not instrumented on
this shared desktop; timings cannot select a phone preset.

Default work: one reference wall draw into the target, one fullscreen texture
draw, one front-facing water draw. No double-sided water or recursive capture.
The water covers roughly20% of the landscape desktop buffer; its fragment
normal/streak work and the extra full-frame composition add cost. Shader work
does not decrease with reduced curtain geometry. `no-water` isolates its draw;
`half-wall` quarters capture pixels, not triangles, and softens the background.
Default target MSAA4 restores wall antialiasing; `samples` is adjustable.
At1440×900 the RGBA16F color texture plus4-sample color storage is approximately
52MB before depth, the canvas and driver overhead; half resolution quarters
that component. Physical-phone cost/preset selection remains due at M4/M9.

Three normal context cycles are warning-free. Ordinary HMR retains one
canvas/GUI and3 geometries/1texture/3programs. HMR **after** forced context
restoration still reproduces the pre-existing Three stale-disposal warnings
(45 with M3's resource set; 30 in M2); rendering resumes. This development-only
nit remains assigned to the builder for M8. Long-uptime noise precision is due
M9. No shader/compiler or runtime errors were observed. Physical testers remain
unconfirmed; M4 interaction and final M9 phone certification are not passed here.
