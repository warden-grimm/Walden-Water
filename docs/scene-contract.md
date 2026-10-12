# Scene contract through M4's field checkpoint

World units are metres. +Y points up and +Z points toward the camera. The
curtain is centred at x=0, z=0, extends from y=0 (pool) to y=6 (lip), and is
2.8 m wide at defaults. `config.curtain` remains the authoritative dimensions.
The curved curtain adds positive z bow, zero at all four edges and 0.16 m at
its centre. Width, height and bow rebuild its CPU geometry. No model scaling
or shader vertex deformation is applied, so raycasting sees the visible surface.

`createScene()` owns the wall, curtain, wall capture, markers, camera, and shared light.
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
plus a soft horizontal margin, with a configurable vertical fade inside y=0
and y=height. Wetness is zero beyond the lip/pool. The phase
`(worldY + time * speed)` moves downward. Layered rotated albedo and warped
wet noise avoid the former single-octave square cells. Softer, less frequent
shelves and a smaller fold reduce undersampled rims on the reference grid.

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
separate from the mask. Faint blue-grey bounce adds fill across the rock;
there is no volume mesh until M6.

The debug wall views show normals, the shared light mask, or the moving wet
mask. They are inspection aids; the normal output uses the same tone-mapping
and colour conversion as other views. M3/M5 must use world positions in this
contract rather than interpreting the cone in UV or camera space.

## Diagnostics

`?debug` lazily loads GUI, fixed sample buffers, and a reusable GPU query pool.
The 10-second warmup/60-second frame-interval protocol remains the gate metric.
`renderCost.cpuSubmit` measures CPU submission across both render passes;
`renderCost.gpu` measures GPU elapsed time with
`EXT_disjoint_timer_query_webgl2`. Results are read on later frames only after
availability. Samples crossing a disjoint event reject GPU data; absent GPU
support retains CPU submission timing with an explicit label. CPU time is
never described as GPU completion time. Query objects are abandoned on context
loss, recreated on restore, and deleted on disposal. The last in-flight GPU
query may finish after the sample ends and is omitted from its count.

GPU measurements reveal cost hidden by vsync, but this desktop evidence does
not establish physical-phone frame rate. No synchronous pixel readback or
application allocations are added to the production loop. Targets resize only
when their dimensions/format change, and replaced resources are disposed.

## Curtain and M4 interface

Reference tessellation is 120 columns × 400 rows (96,000 triangles), reduced
60 × 200 (24,000). `curtain.mesh` is the future raycast object. It uses translation
only: world x=(u−0.5)×width, world y=v×height, and
z=bow×(1−(2u−1)²)×sin(πv). UV (0,0) is bottom-left at the pool;
(1,1) is upper-right at the lip. Downward transport is **negative v**. M4 field
textures should keep this bottom-up orientation and avoid a second flip.
After M4 shader displacement, raycasting will require an explicit matching
surface strategy; the present exact agreement does not claim that future work.

The flow coordinate is travelTime((1−v)×height)−time×flowSpeed, where travelTime
is the rationalized positive root of d=v0×t+½g×t². A constant phase travels
down and accelerates from 0.7 m/s at the lip to about 5.41 m/s at the pool at
defaults. Debug flow bands expose that sign/stretch; the water view uses
stretched fBm in the same coordinate. Noise-based normals affect shading only;
central differences divide by 2×step×width/height to measure slopes per metre,
with `normalStrength` a height scale in metres. `normalStep` remains a finite
sampling/filter width, so very large steps can smooth fine detail. Ragged edge
coverage, lip fade and lower tears modulate opacity. Long-uptime noise precision
is an explicit builder follow-up due M9; no wrapped phase discontinuity is added.

## Wall capture, color, and transparency

Render order: (1) wall-only Scene into a linear render target; (2) fullscreen
background sampling that completed target, then the front-facing transparent
curtain and optional framing markers (hidden by default, renderOrder 2 when
enabled). The costly wall geometry draws once. The wall target uses 4× MSAA,
clamped to renderer capability; the debug `samples` rebuild control permits 0/2/4.
The wall source material never samples the target; curtain/background are
absent from the source Scene. No target reads itself. The pass restores the
prior target, cube face, mip and autoClear in finally, including on exceptions;
global viewport/scissor, exposure and camera are not changed.

With Three r186, ordinary offscreen targets use linear working color and no
tone mapping. The final background and water each apply ACES and sRGB once.
Water premultiplies after output conversion, uses normal premultiplied blending,
depthWrite=false and FrontSide, avoiding a second transparent backface draw.
Its screen coordinates come from gl_FragCoord / actual canvas buffer dimensions;
target sampling clamps half a texel at the edges. `refraction.wallResolution`
scales the entire wall/background target after DPR (default 1, minimum 0.5),
not just the distortion. Reduced resolution softens the whole background.
Refraction disabled removes the offset but retains the background pass.

RGBA16F is preferred after extension and framebuffer completeness checks.
Forced/unsupported byte mode uses SRGB8_ALPHA8: WebGL2 encodes storage and decodes
sampling in hardware, retaining more precision in dark rock than linear RGBA8.
The shader still receives linear values; values above one clip (a documented
LDR fidelity fallback, not M4 signed-field encoding). The selected format is
logged on changes. Context restoration abandons the old target (whose GPU
objects the lost context destroyed), then reselects and checks a fresh target.
This avoids invoking Three's stale disposal callbacks on the new context.

## M4 field checkpoint

The checkpoint adds the field and its debug overlay, not water deformation yet.
`main.js` owns Pointer Events; `createScene()` owns the ping-pong field. Frame
order is shared time → current camera/matrices → pointer projection → field
update → wall capture → curtain. The field is sampled in the same frame that
consumes current input. Ten reusable pointer slots and uniform segments bound
the work. Pointer capture, up/cancel/lost capture, blur and hidden-page cleanup
remove held obstacles; a tap ending between frames is consumed once.

Contacts intersect the analytical **resting curved ribbon** with reusable
ray/vector objects. Tests compare it with the actual reference/reduced meshes
in both orientations during camera drift (UV error below 0.00001). This stable
contact surface continues through holes instead of losing the finger when
water parts. M4's next step must preserve screen alignment under displacement;
the checkpoint does not claim exact raycasts against future GPU-deformed triangles.
Both ends of a swept segment use the current camera, so drift creates no false
swipe speed. Velocity uses world metres per second, not events or frames.

The default 256×512 targets have no depth, MSAA or color conversion. RGBA16F
stores signed lateral force in R and pressure in G. The fallback packs signed
force into RG as a 16-bit integer (zero=32768, range ±32767) and pressure into
BA (0..65535). All textures use nearest filtering; four decoded samples provide
manual bilinear interpolation. Packed bytes must never be interpolated before
decoding. Outside the field returns neutral, never wrapped/clamped disturbances.
The exact byte neutral is RGBA=(128,0,0,0). Shader constants in this codec are
integer representation definitions, not art controls.

Allocation checks both framebuffers, then renders known signed/positive values
and validates their interpolation through a **vertex texture sample** and byte
readback, including exact neutral. Auto mode falls back to packed bytes if
half-float support or this actual path fails. These reads happen only during
allocation, not the render loop. `?debug` exposes an explicit `inspectTouch()`
readback for evidence; normal rendering never calls it.

Each simulation pass reads one target and writes the other, then swaps their
stable texture uniform. Both creation and stepping restore target/face/mip and
autoClear in finally. Rebuilds dispose old targets; context restoration abandons
objects from the lost context and recreates/validates neutral targets. At defaults
the pair uses about 2 MB of float color storage, or 1 MB of byte storage.

Backtracing uses the same gravity/lip speed as the water, with the configurable
transport multiplier. Negative v is downward; the sampled source is above each
destination. Exponential neighbor mixing diffuses and exponential decay reaches
the neutral cutoff in `touch.recovery` seconds. Bounded substeps limit large
deltas. Swept Gaussian capsules pin a held obstacle using max pressure rather
than repeatedly adding energy per refresh; swipe strength is velocity-scaled.
The overlay maps left force to red, pressure to green and right force to blue.
