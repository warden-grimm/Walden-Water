# Scene contract through M2

World units are metres. +Y points up and +Z points toward the camera. The
curtain is centred at x=0, z=0, extends from y=0 (pool) to y=6 (lip), and is
2.8 m wide at defaults. `config.curtain` remains the authoritative dimensions.
The M1 curtain is still a flat translucent placeholder until M3.

`createScene()` owns the wall, placeholder resources, camera, and shared light.
`main.js` owns the renderer and lifecycle. `time.js` provides the single elapsed
time uniform: hidden time is excluded and stalled deltas are clamped. New
materials must reuse this object, not run independent clocks.

## Rock

The undisplaced wall sits at z=-0.6. Four-octave fBm, ridged value noise, and
warped strata form the relief. Recesses extend backwards by at most
`rock.relief + rock.ledgeDepth`; narrow shelves fold downward by at most
`rock.overhang`. Double-sided drawing exposes their undersides. This is a
procedural sheet, not a closed cliff mesh, and does not cast shadow maps.
Crevice darkening is an artistic approximation to local occlusion.

Smooth normals use central differences of that same xyz displacement function,
with `normalStep` in world metres. There is no independent bump surface.
Turning displacement off makes both position and normal flat. The wall uses
translation only; adding a nonuniform model scale would require an inverse
transpose normal transform. Wet streaks are confined to the curtain footprint
plus a soft margin. The phase `(worldY + time * speed)` moves downward.

Reference quality is 256×256 segments (131,072 wall triangles); reduced is
128×128 (32,768). The grid changes only on the GUI control's finished edit and
disposes the previous geometry. Reference remains the default pending phone
measurements. Reduced loses small folded lip detail; it is a deliberate quality
tradeoff, not equivalent geometry. `wall.width/height` are minimum dimensions:
framing expands them to cover the farthest relief depth and all camera drift
phases, including ultrawide aspect ratios. Expansion stretches grid spacing, so
extreme widths have lower local tessellation density.

## Shared shaft light

`createLight(config.light)` returns stable uniform objects. Consumers spread
`light.uniforms` into their material uniforms and include `shaders/light.glsl`.
`configure()` mutates values in place, so later water, particles, and visible
volume receive exactly the same data. No separate Three.js SpotLight is needed
for this custom shader lighting path.

Defaults: source (-3.5, 8, 3), target (0, 4, 0), half-angle 21 degrees, penumbra
0.55, intensity 1.5, warm `#fff1d5`. Direction is normalized **target − source**.
`shaftMask(worldPosition)` returns a soft angular cone times an axial fade from
6 to 10 metres, with zero behind the source. The axis crosses the upper-middle
curtain at y=4. The fade is almost gone near the pool. `fadeStart` is clamped
below `range` to keep GUI edits well defined. Intensity and light colour are
separate from the mask. Faint blue-grey bounce illuminates unlit rock only;
there is no volume mesh until M6.

The debug wall views show normals, the shared light mask, or the moving wet
mask. They are inspection aids; the normal output uses the same tone-mapping
and colour conversion as other views. M3/M5 must use world positions in this
contract rather than interpreting the cone in UV or camera space.

## Diagnostics

`?debug` lazily loads GUI, fixed sample buffers, and a reusable GPU query pool.
The 10-second warmup/60-second frame-interval protocol remains the gate metric.
`renderCost.cpuSubmit` measures CPU time inside `renderer.render()` only;
`renderCost.gpu` measures GPU elapsed time with
`EXT_disjoint_timer_query_webgl2`. Results are read on later frames only after
availability. Samples crossing a disjoint event reject GPU data; absent GPU
support retains CPU submission timing with an explicit label. CPU time is
never described as GPU completion time. Query objects are abandoned on context
loss, recreated on restore, and deleted on disposal. The last in-flight GPU
query may finish after the sample ends and is omitted from its count.

GPU measurements reveal cost hidden by vsync, but this desktop evidence does
not establish physical-phone frame rate. No targets, textures, synchronous
pixel readback, or application allocations are added to the production loop.
