# M4 evidence — field checkpoint

This is an early architecture checkpoint, not M4 acceptance. The accepted
application baseline is M3 `a4b55164809c009fbb12b7d10929150ebc3ce3b0`.
`baseline-m3-timing.json` was recorded at `ee68428` before any application edits;
that deployed application is identical to accepted M3.

- `checkpoint.mjs`: native CDP mouse/two-touch overlay probes and recordings.
- `checkpoint/checks.json`: snapshots, pressure/centroids and console messages.
- `checkpoint/auto.webm`, `byte.webm`: hold, release, swipe, two contacts/cancel.
- `checkpoint-lifecycle.mjs`, `checkpoint/lifecycle.json`: field target size/
  precision rebuilds, context restore and recovery with actual shared elapsed
  time after release. Nominal release labels in the other script also include
  screenshot/readback overhead; do not use those labels as latency measurements.
- `fallback.mjs`, `checkpoint/automatic-fallback.json`: browser extension hidden
  before page initialization to exercise automatic byte selection on this GPU.
- `measure.mjs <label>`: 10s warmup plus 60s sample, 1440×900/DPR1, default
  camera drift, GUI hidden and idle. Run timing scripts sequentially; do not
  edit application sources or run other GPU probes while sampling.

Builder preview: `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`.
These scripts use `../M3/cdp.mjs` and an isolated native Edge on CDP9333.
Reviewer must adapt copies to its own checkout/5175/CDP9334. No source files
are changed by the probes. `inspectTouch()` is a deliberate debug-only GPU
readback; measurements never invoke it per frame.

Environment: Windows, Edge155, NVIDIA RTX A4500/ANGLE D3D11, default reference
meshes, full wall target/MSAA4. Checkpoint adds one 256×512 field pass at 60Hz,
4 draws / 227,076 triangles total; no water deformation yet. Physical-phone
M4 interaction remains unverified. User's iPhone 15 Pro Max report covers M3
rendering only; OS/browser details have been requested.
