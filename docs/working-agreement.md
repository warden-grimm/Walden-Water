## Working Agreement (Builder)

Build in the milestones below, in order. After each milestone:

- Run `npm run build` and fix any errors.

- Commit with a message `M<n>: <summary>`.

- Write a short `REVIEW_[NOTES.md](http://NOTES.md)` entry covering:

  - what changed

  - what to test manually

  - known gaps

  - any deviations from this spec, with the reason for each

Stop after each milestone for review, and don't start the next one until review feedback is addressed.

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

- Use only these dependencies: `three`, `postprocessing` (or Three's examples EffectComposer), `lil-gui`, `vite-plugin-glsl`. Ask before adding anything else.

- Keep every tunable value in one `src/config.js`, wired to the debug GUI. No magic numbers in the shaders: pass values as uniforms.

- Write shaders as separate `.glsl` files with brief comments explaining the math, so they can be reviewed.

- Put no per-frame `new` allocations in the render loop: reuse vectors, arrays, and render targets.

- Dispose of GPU resources on teardown and hot reload, so Vite HMR doesn't leak WebGL contexts.

- If the WebGL extension for half-float render targets is unavailable, fall back to `UnsignedByteType` with encoded values, and log which path was taken.