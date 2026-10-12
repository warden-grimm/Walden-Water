# Working Agreement: Builder and Reviewer

The product specification is [goal.md](goal.md). Concrete acceptance checks and evidence for each milestone are in [milestones.md](milestones.md). Claude's independent prompt and rubric are in [reviewer.md](reviewer.md).

The rotating-sculpture starter is a baseline, not an approved M1. Work proceeds through M1–M9 in order; plan review does not approve any implementation milestone.

## Ownership and Orca review gate

- The builder owns implementation and fixes. Claude owns findings and the verdict, and must not rewrite the implementation being reviewed.
- Use separate Orca workspaces: the builder checkout and a child review worktree created from the exact submitted commit. Review committed snapshots, never a moving working directory. Keep the builder idle on the submitted milestone during review.
- Each submission names the milestone, previous approved commit (`BASE_SHA`), submitted commit (`HEAD_SHA`), review workspace ID, and evidence location. The reviewer verifies `git rev-parse HEAD` and reviews `git diff BASE_SHA..HEAD_SHA`.
- Save Claude's report under `docs/reviews/M<n>-review-r<revision>.md`, tied to `HEAD_SHA`. A report written afterward is review evidence, not a change to the reviewed implementation.
- The builder addresses findings in focused `M<n>: ...` fix commits and submits a new exact head. Claude verifies fixes and regressions. Never silently carry a blocker into the next milestone.
- Advance only after `APPROVE` or `APPROVE WITH NITS`, required evidence is present, and remaining nits have an owner and due milestone. `CHANGES REQUESTED` or missing critical evidence keeps the gate closed. Passing builds, completed agent tasks, acknowledgments, and silence are not approval.
- The coordinator records the report/outcome in `REVIEW_NOTES.md` and updates Orca status/comments. It processes early questions/blockers during review. Commit review reports before releasing an agent; preserve the review worktree for inspection. Do not delete workspaces automatically.
- Review only the submitted milestone plus regressions and interface risks. Future features are expected gaps until their milestone; speculative preferences are not blockers.

## Builder submission

Build in the milestones below, in order. After each milestone:

- Run `npm run build` and fix any errors.

- Write a short [REVIEW_NOTES.md](../REVIEW_NOTES.md) entry covering:

  - what changed

  - what to test manually

  - known gaps

  - any deviations from this spec, with the reason for each

  - build result, reproducible preview command/URL, viewport/device/browser, performance observations, and screenshots/recordings

- Commit implementation and notes with `M<n>: <summary>`. Put the resulting full SHA in the dispatch; a commit cannot contain its own SHA.
- Give Claude [reviewer.md](reviewer.md), populated with milestone, exact base/head, and evidence paths. Use [reviews/TEMPLATE.md](reviews/TEMPLATE.md) for the report.

Stop after each milestone for review, and don't start the next one until review feedback is addressed.

Raise problems when discovered: report the failing check, reproduction, affected milestone, consequence, and smallest proposed remedy. Stop dependent work when an unresolved choice would cause rework; continue only independent work within the current milestone. Use early draft checkpoints for M3 transparency/refraction, M4 field transport/fallback, and M6 depth fade before completing each feature.

Capture a performance baseline in M1 and compare every milestone on the same available device. M9 is final verification, not the first profiling pass. Device emulation is not evidence of real mobile GPU performance or multi-touch behavior.

### Milestones

- **M1 – Scaffold:**

  - Vite project, renderer, camera framing for portrait and landscape, resize and DPR handling, render loop.

  - `?debug` lil-gui panel.

  - A placeholder plane for the curtain and a placeholder plane for the wall.

- **M2 – Wall:**

  - Procedural rock displacement and the wet-rock shader.

  - Basic SpotLight aligned to the planned shaft direction.

- **M3 – Curtain:**

  - Water ribbon mesh and the flowing shader (streaks, gravity acceleration, edge breakup, fresnel, glints).

  - No interaction yet.

- **M4 – Touch field (critical):**

  - Pointer tracking (multi-touch), raycast to curtain UVs.

  - Ping-pong disturbance FBO with splat, downward advection, and decay.

  - Vertex displacement and foam driven by the field.

  - A debug toggle that draws the field texture on screen.

- **M5 – Particles:**

  - Lip and base spray, touch-burst splashes with gravity.

  - Dust and mist motes that are visible only inside the shaft.

- **M6 – Light shaft:**

  - Volumetric cone with soft depth fade.

  - Matching light uniforms shared across materials.

- **M7 – Pool:**

  - Ripples and impact rings.

- **M8 – Post and polish:**

  - Bloom, grain, vignette, tone mapping.

  - Adaptive resolution and visibility pause.

  - Optional audio.

- **M9 – Perf pass:**

  - Profile, remove per-frame allocations, verify mobile frame budget.

  - Document the final settings.

### Constraints

- Keep the existing `vite` build dependency. Allowed feature dependencies are `three`, `postprocessing` (or Three's examples EffectComposer), `lil-gui`, and `vite-plugin-glsl`. Ask before adding anything else. Prefer the already-supported `?raw` imports when a GLSL plugin is unnecessary.

- Keep every tunable value in one `src/config.js`, wired to the debug GUI. No magic numbers in the shaders: pass values as uniforms.

- Art, interaction, quality, and timing values are tunables; mathematical identities and fixed indexing constants are not tuning knobs. Label expensive GUI settings that rebuild meshes/targets, and dispose of replaced resources.

- Write shaders as separate `.glsl` files with brief comments explaining the math, so they can be reviewed.

- Put no per-frame `new` allocations in the render loop: reuse vectors, arrays, and render targets.

- Dispose of GPU resources on teardown and hot reload, so Vite HMR doesn't leak WebGL contexts.

- If the WebGL extension for half-float render targets is unavailable, fall back to `UnsignedByteType` with encoded values, and log which path was taken.

- In M4, validate framebuffer renderability and the actual filtering/sampling path, not only an extension name. Provide a debug override for byte mode so it can be tested on a capable GPU too.
- Add context-loss/restoration handling in M1 and extend it as GPU resources are introduced. Keep visibility pause throughout; M8 validates it across the completed pipeline.
- Optional audio/haptics do not block acceptance. If added, document assets and first-touch behavior separately.
- Preserve static GitHub Pages deployment and relative asset URLs. Creating a remote or publishing is separate from milestone review.
