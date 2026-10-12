# M4 evidence

This directory preserves the early checkpoints and the coupled M4 candidate;
neither is M4 acceptance without the required independent review and phone run.
The accepted
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

## Checkpoint fixes

`fixes.mjs` and `fixes/results.json` exercise the actual shaders on a separate
renderer in the builder browser. Ten auto/byte decay runs include the reported
165/240 Hz long-recovery, 144 Hz low-cutoff and 480 Hz default cases. All reach
exact signed/pressure neutral. Samples occur about every 0.25 seconds: default
no-transport/no-diffusion runs first report neutral at 1.75 seconds; recovery=3
runs at 2.98–3.23 seconds. These are simulated timesteps, not display refresh or
phone latency measurements.

Corrupting both validation readbacks disables touch and overlay at startup and
after context restoration; water keeps rendering and the failure notice stays
hidden. One expected diagnostic is logged, with no runtime/shader errors. The
capture shows the scene after failed restoration. Removing the hook and loading
normally restores the half-float path. Two initial evidence-script errors (regex
escaping and retaining the context-loss extension) were repaired before this run;
neither changed application code.

Node regression tests now cover 30/60/125 Hz input against 30/60/120/144/240 Hz
rendering, event-velocity expiry at rest, same-frame re-press and a second finger
arriving during the first finger's sweep. Physical-phone checks remain due.

## Retry and timestamp follow-up

`retry.mjs` / `retry/results.json` exercise unavailable input, a healthy size
retry, a failed then healthy context restore, and an intentionally disabled
setting. Availability gates input/overlay independently of the requested
settings: both healthy retries restore one pointer and pressure 0.8496, while
the intentional disable remains off. Three expected warnings correspond to
three failure episodes; no runtime errors. `unavailable-overlay.png` verifies
that a requested overlay cannot obscure the scene when the field is unavailable.

`retry/velocity.json` reruns the archived r2 Node probe with its explicit builder
checkout argument. The short input-history window reduces jitter, and the
render-clock expiry clears the +200 ms event-clock case. New tests cover both
cases and field availability; 17/17 tests pass. The archive scripts themselves
remain unchanged. These are controlled input probes, not phone latency evidence.

## Coupled water candidate

`coupled.mjs` records normal water with native CDP touch input in portrait
(390×844 CSS pixels) and landscape (844×390), DPR2, both auto and forced-byte.
The four `coupled/*.webm` clips last 13.84–14.03 seconds, verified by ffprobe
in `coupled/video-durations.json`. They include a three-second hold, a second
finger, slow/fast sweeps, lifting one finger and releasing both, and recovery.
`coupled/checks.json` records two → one → zero contacts, neutral final fields,
actual snapshots and an empty runtime/shader error log for all four runs.
Screenshots/readback add overhead to the clip sequence; these clips do not
measure latency. Earlier timestamped recovery measurements remain in
`checkpoint/lifecycle.json`.

Twenty pressure-diagnostic captures use the actual deformed water vertices with
camera drift enabled, five contacts per orientation/format. `coupled-images.py`
measures the near-maximum grayscale centroid in a 12-CSS-pixel contact ROI;
`coupled/image-measurements.json` records a maximum error of 0.139 CSS pixels.
This checks projected contact alignment, not physical touch latency or exact
intersection with GPU triangles. The diagnostic excludes alpha holes so the
field centre can be measured. Ordinary final-water images/clips accompany it.

The same image analysis compares reference/reduced deformation normals with
camera drift and flow-noise normal strength disabled, a stationary held finger,
and a curtain-only crop. The maximum channel difference is 6/255, mean 0.0284/255;
0.137% of pixels differ by more than 2/255. Reduced removes 75% of curtain
triangles, with small localized shading differences in this view; reference
remains the default. This is not a phone preset recommendation or proof for
every gesture/configuration.

`coupled-preview.mjs` / `coupled-preview/` preserve the initial desktop visual
inspection of held water, deformation normals, wake and recovery. No recording
or probe script is loaded by the production app. No dependency was added.

`final-measure.mjs <label> <base-url> <mode>` runs the matched 10-second warmup
and 60-second sample. Modes are `idle`, `interaction`, and `byte-interaction`.
The interaction trace sends two native touch contacts on bounded sine paths
throughout warmup/sampling, including the M3 reference where input has no effect.
No screenshot, recording or pixel readback runs during timing. Completed runs
validate 1440×900/DPR1 before and after. Source/settings remain frozen, sequential
on the same Edge instance. The fresh M3 reference uses preserved review checkout
`f20b5380c73eaa074d417b4bdf3f287991a079fc` on port5176; its `src/` diff against
accepted `a4b5516` is empty.

One initial timing attempt was interrupted by the next browser session before
it finished; a following sample used 1416×908 after that session disconnected.
The latter is preserved as `invalid-overlapping-session-timing.json`, excluded
from comparisons. The corrected queue runs one script to completion before
starting the next and explicitly checks viewport size. This was a harness
sequencing error, not an application regression.

| Completed run | Frames | Frame median/p95 ms | GPU median/p95 ms |
| --- | ---: | ---: | ---: |
| M3 idle | 3,389 | 17.7 / 18.1 | 1.562 / 5.788 |
| M4 idle | 3,391 | 17.6 / 18.1 | 3.079 / 5.621 |
| M3 same two-touch trace | 3,380 | 17.9 / 18.1 | 1.268 / 4.700 |
| M4 two-touch trace | 3,380 | 17.9 / 18.1 | 3.389 / 5.566 |
| M4 byte two-touch trace | 3,383 | 17.8 / 18.1 | 3.385 / 5.905 |

Raw samples are in `final-*-timing.json`; `final-cost-summary.json` extracts the
results. All five completed without viewport notifications or disjoint GPU data.
CPU submission median/p95 is 0.1/0.2 ms throughout. M4 has four draws / 227,076
triangles versus M3's three / 227,074. Neither frame median nor p95 increases
by >10%. GPU median adds about 1.52 ms idle / 2.12 ms interacting in this sweep,
including the fixed pass/target-switch cost investigated at the checkpoint;
it cannot be attributed entirely to field texel processing. The timings do not
establish 60 fps or thermal stability on phones. Settings, reference geometry,
full wall resolution and MSAA4 remain unchanged pending physical-device evidence.

`coupled-lifecycle.mjs` / `coupled/lifecycle.json` recheck the completed shaders:
six target rebuilds, three HMR cycles and two context restores retain four
geometries / three textures / four programs, one canvas and one GUI. An actual
delivered contact remains active after orientation change, then cancellation
clears it and the field heals. Hiding with a held contact clears input and
stops the frame count; resuming heals normally. Reduced motion fixes the camera.
The runtime/shader warning log is empty. This runs HMR before forced context
loss; the previously accepted M3 HMR-after-restore warning remains due M8.

`retry.mjs ./coupled-retry/` repeats the unavailable-field/healthy-retry checks
with the final vertex shader. Water remains visible, requested settings survive,
and healthy retries produce one active contact at pressure 0.8496. Intentional
disable stays disabled. Three expected validation warnings correspond to the
three injected failure episodes; no unexpected runtime errors.

The lifecycle harness exposed a stale browser input session: native CDP touch
commands returned without delivering pointer events. Its last incomplete attempt
is preserved in `coupled/lifecycle-incomplete.json`. Resetting only the dedicated
Edge browser restored delivery; no application change was needed. The three
original interaction timing files are retained as `invalid-no-touch-*-timing.json`
and excluded. Corrected timing uses explicit focus/touch emulation, asserts two
delivered pointer-down events, and checks two active M4 contacts at completion.
The verified M3 touch run used the clean original tab; M4 auto/byte used fresh
tabs in the same browser to prevent stale routing across CDP connections.
The earlier four coupled clips already asserted their two/one/zero contact
counts and remain valid. Physical-phone behavior still requires the human run.
