# M2 builder evidence

Captured 2026-10-12 from the builder checkout, served with
`npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`.
Windows desktop, Edge 155, NVIDIA RTX A4500 through ANGLE/D3D11. These are
desktop and emulated-viewport observations, not physical-phone certification.

## Performance protocol

`measure.mjs baseline|reference|reduced` uses the dedicated Edge CDP instance on
port 9333. Each run navigates fresh, activates its tab, uses 1440×900 / DPR 1,
disables the OS reduced-motion preference, hides the GUI, leaves default camera
drift on, and performs no interaction. `sample()` measures 60 seconds after
10 seconds of warmup. No postprocessing is enabled. The M1 curtain and markers
have identical settings in all runs. M2 changes the wall and adds its lighting.
Only the reduced run changes geometry quality. Raw frame intervals and actual
counts/settings are in the timing JSON files.

The baseline was captured before application edits at `f070377`; application,
lockfile and Vite contents exactly match the accepted M1 implementation
`6af1797edb83f5677eb46ff49b92b713181e0240` (`git diff` over those paths is empty).
The final reference/reduced files were measured after M2 shader tuning. Files
with `initial` in the name preserve the earlier sweep before making the ledge
sharpness constant an exposed uniform; defaults and appearance were unchanged.

Same workstation/browser session and power setup throughout, no intentional GPU
stress or interaction during samples. Ambient temperature, GPU clocks and other
system activity were not instrumented; thermal equivalence cannot be certified.
Do not interpret refresh-limited frame intervals as zero rendering cost.
Asynchronous GPU elapsed time and CPU submission time are supplemental metrics
in M2; M1 did not yet expose them. Initial reference GPU median/p95 was
0.382/3.750 ms; final reference was 0.227/5.372 ms, indicating variable tail cost
on this shared desktop. No disjoint events were reported. This is recorded as
a profiling limitation, not an inferred shader-only cost or mobile budget.

The final comparison and disposition are in the M2 entry of
[REVIEW_NOTES.md](../../../REVIEW_NOTES.md).

## Visuals

- [Desktop](desktop.png): 1440×900 / DPR 1, defaults.
- [Portrait](portrait.png): 390×844, requested DPR 3, render buffer capped at
  DPR 2 (780×1688). Browser screenshot uses its display DPR.
- [Landscape](landscape.png): 844×390 / DPR 2.
- [Ultrawide](ultrawide.png): 3840×720 / DPR 1, wall expands with framing.
- [Reference](rock-reference.png) / [reduced](rock-reduced.png): matched 1440×900
  / DPR 1; curtain opacity 0, drift off, trickle speed 0 for comparison.
  Reference retains finer shelf rims; reduced coarsens narrow ledges and small
  normal changes. Reference remains default; phone preset choice is pending.
- [Normals](normals.png) / [flat normals](normals-flat.png): displacement on/off,
  same footprint. [Sheen off](sheen-off.png) isolates the dry rock response;
  [light mask](light-mask.png) shows the shared cone intersection and fade.
- [Moving wet highlights](wet-trickle.webm): 7.97 seconds, VP9, 1440×900 at
  captureStream 30 fps; curtain opacity 0 and drift off to isolate trickling.
  Wet settings otherwise default. Positive time phase advects highlights down.

## Lifecycle and reproducibility

`verify.mjs` captures images/video and writes `checks.json`: ordinary URL without
debug, DPR cap, orientations, separate toggles, three context cycles, four HMR
cycles, actual reduced-motion emulation, native tab activation/visibility, and
console errors. It temporarily appends comments to `src/config.js` for HMR and
restores the exact original in `finally`; run only in an owned working checkout.
`cdp.mjs` is the small Node 24 WebSocket helper copied from M1 reviewer evidence.
These scripts are historical procedures, not runtime code or npm tests.

Launch the dedicated browser with `--remote-debugging-port=9333`, an isolated
temporary user profile, `--disable-features=CalculateNativeWinOcclusion`, and
`--disable-backgrounding-occluded-windows`. Those flags allow genuine tab
visibility tests even while the desktop automation window is occluded. Do not
attach these scripts to a personal browser session. Run samples sequentially;
do not run capture/HMR procedures during a timing sample.

Six Node tests cover timeline/framing, wall coverage through aspect 6:1,
shared-light identity and clamp invariants, sampler interruption, and GPU timer
availability/disjoint/context/fallback behavior. Browser captures verify actual
shader compilation. Physical phone pinch, backgrounding, multi-touch and
latency remain unverified and due at M4; final iPhone/Android performance is M9.
