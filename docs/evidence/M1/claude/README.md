# Independent Claude evidence archive

These files were copied unchanged from Claude's review scratch directory after it finished reviewing implementation head `6af1797edb83f5677eb46ff49b92b713181e0240`. They accompany the [unchanged review report](../../../reviews/M1-review-r1.md), committed before the Orca worker was released.

`checks-out.json` and the five PNGs record independent runtime/framing/context checks. The `.mjs` files preserve the review's CDP procedures for GUI/framing, context, HMR, sampling, native tab switching and OS window minimize/restore. They are historical, environment-specific evidence: paths, preview port 5175 and the dedicated Edge CDP endpoint 9333 belong to that review session. They are not part of the application or automatic test suite. Reuse requires an isolated browser and updated paths/ports.

Claude served its own checkout at `C:/Users/Adam Tate/orca/workspaces/Walden-Water/claude-m1-review`, used Edge 155.0.4283.45 on Windows 11 / NVIDIA RTX A4500, and stopped its preview and browser afterward. Native occlusion was disabled so actual tab selection/minimize governed visibility. Native pause/resume passed without the builder's document-getter override; first resumed-frame elapsed delta was zero. The independent 60-second sample after 10 seconds of warmup measured median 17.6 ms and p95 18.2 ms at 1440×900 / DPR 1.

The report contains the verdict, exact observations and outstanding nits. Orca run `run_6db9e1fd6f26`, task `task_5fbc1a6306c4`, dispatch `ctx_a61438349715` also retains the captured review transcript. No mobile hardware certification is implied.
