# Scene contract through M6

World units are metres. +Y points up and +Z points toward the camera. The
curtain is centred at x=0, z=0, extends from y=0 (pool) to y=6 (lip), and is
2.8 m wide at defaults. `config.curtain` remains the authoritative dimensions.
The curved curtain adds positive z bow, zero at all four edges and 0.16 m at
its centre. Width, height and bow rebuild its CPU geometry. M4 adds GPU vertex
deformation; contacts use the stable resting ribbon described below. No model
scaling is applied.

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
`renderCost.cpuSubmit` measures CPU submission across all render passes;
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
60 × 200 (24,000). The resting curtain uses translation
only: world x=(u−0.5)×width, world y=v×height, and
z=bow×(1−(2u−1)²)×sin(πv). UV (0,0) is bottom-left at the pool;
(1,1) is upper-right at the lip. Downward transport is **negative v**. M4 field
textures should keep this bottom-up orientation and avoid a second flip.
After M4 shader displacement, analytical resting-surface contacts preserve
interaction through the opening. They are not intersections of GPU triangles.

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

<a id="m4-field-checkpoint"></a>

## M4 field and contacts

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
water parts. The displacement strategy below preserves the projected centre;
this is not an exact raycast against GPU-deformed triangles.
Both ends of a swept segment use the current camera, so drift creates no false
swipe speed. Velocity uses projected world distance over a short event-time
window (`touch.velocityWindow`, default 50 ms), independently of rendering.
A fixed 16-sample ring per pointer reduces timestamp jitter without hot-path
allocations. Velocity persists through intervening display frames and expires
after `touch.velocityHold` seconds without consumed input (default 50 ms),
measured solely with render time so event-clock skew cannot retain a boost. Contact is
never extrapolated ahead of the finger. A reused pending pointer ID is re-armed.

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
half-float support or this actual path fails; either float or half-float color
buffer extension is considered, then actual renderability is tested. If both
paths fail, field availability gates touch/overlay, one diagnostic is logged,
and a neutral 1×1 CPU texture keeps the water rendering. User preferences stay
intact; a healthy retry automatically restores requested interaction and overlay
while respecting an intentional disabled setting. Changing format/size, explicitly
re-enabling touch, or restoring context retries validation. These reads happen only during
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
deltas. Backtraces crossing the launch lip sample the neutral exterior rather
than continuing the trajectory backward past launch. Packed-byte decay removes
at least one code point per nonzero step, preventing rounding from retaining a
tiny lateral force indefinitely at high refresh rates; this only changes the
quantized low-amplitude tail. Swept Gaussian capsules pin a held obstacle using max pressure rather
than repeatedly adding energy per refresh; swipe strength is velocity-scaled.
The overlay maps left force to red, pressure to green and right force to blue.

## Field-driven water

The vertex shader samples the completed field at each resting UV, using the same
decode-before-interpolation function as the simulation. Signed force pushes x
by `force × radius × sidePush`; pressure pushes toward the camera by
`pressure × radius × forwardPush`. This latter displacement follows the view ray
after the x offset, preserving its projected position. Symmetric lateral force
is zero at a stationary contact centre. The field remains in resting UV space;
displacing its coordinates would create feedback and move the input target.
The debug overlay uses resting geometry; the touch-pressure diagnostic uses the
same deformed vertices as production water so alignment can be checked honestly.

Fragment derivatives measure the deformed and resting triangle normals. Their
difference is added to the smooth resting bow normal, then to the existing
flow-noise normal. This preserves the M3 smooth bow at zero field while making
bulge slopes affect refraction and highlights. It is a shading approximation,
not a newly computed smooth analytic normal. Reference/reduced geometry remains
120×400 / 60×200, with measured deformation fidelity in the M4 evidence index.

Interpolated vertex pressure drives a smooth alpha opening between `gapStart`
and `gapEnd`. The rim weight `4 × gap × (1 − gap)` localizes foam; its color,
amount and opacity are configurable and inherit the shared shaft illumination.
The gap reveals the completed wall capture. No separate foam mesh, pass, texture,
or production fragment-stage field read is added. The diagnostic overlay alone
samples the full field in the fragment stage. All tunables are in `config.touch`
and the GUI. An unavailable field is gated to zero in the vertex shader, so its
neutral fallback continues to render undisturbed water.

<a id="m5-particles"></a>

## M5 particles and the M7 impact contract

`createParticles()` (`src/scene/Particles.js`) adds three additive `Points`
draws after the curtain (renderOrder 3–5): continuous **spray**, touch
**bursts**, and shaft **motes** (dust plus mist). None is part of the wall
capture, so refraction never samples particles. Additive premultiplied
blending (ONE, ONE) is order-independent: overlapping points need no sorting,
and nothing writes or tests depth. All positions are evaluated analytically in
the vertex shader from the shared time uniform and fixed per-point seeds
(deterministic mulberry32, regenerated only when a count changes). There is
no CPU per-particle update, particle render target, or readback. Point
geometry carries only seeds; `position` exists solely to set the draw count,
so frustum culling is disabled.

Sprites are sized in world metres: pixels = diameter × `uPointScale` / view
depth, with `uPointScale` = buffer height / (2·tan(fov/2)) updated on resize.
Below `droplets.minPixels` a sprite keeps the minimum size and its alpha is
scaled by area, avoiding sub-pixel shimmer. Sizes clamp to the device's
`ALIASED_POINT_SIZE_RANGE`, read at creation and after context restoration.
The fragment profile is exp(−softness·r²)·(1−r²), reaching zero at the rim.

**Spray.** `spray.count` points; the first `lipShare` peel forward off the
lip (y=height, bow zero), the rest are thrown up from the base impact line
(y=pool). Each point loops with a period fixed by its seeds; each loop
re-seeds launch values with irrational increments so drops do not repeat.
Base drops retire exactly when they return to the pool; lip drops retire at
the end of their life or on crossing the pool, whichever is first.

**Touch bursts.** `SplashEmitter.js` owns a fixed ring of `bursts.slots`
descriptors in a slots×2 RGBA32F `DataTexture` (nearest, no mipmaps):

| Texel | RGB | A |
| --- | --- | --- |
| (i, row 0) | launch origin, world m | start time on the shared clock; < 0 = empty |
| (i, row 1) | launch velocity, m/s | strength [0, 1] |

The CPU writes eight floats only when a burst spawns and flags one texture
upload that frame; nothing else changes per frame. A new contact (the
tracker's `began` flag) splashes once at `bursts.press`, so a held finger never
keeps emitting. A moving contact emits while its event-time drag speed is at
least `minSpeed` and it has travelled at least `spacing` metres on the curtain
since that finger's last splash (so touch jitter on a held finger, which reads
as brief high speed, cannot stream splashes), at most once per `interval`
seconds per finger, with
strength (speed − minSpeed)/(fullSpeed − minSpeed). Launch origin is the
resting-curtain point of the contact UV. Launch velocity = drag × `throw`,
plus `lift` up and `outward` toward the camera (both scaled by
minShare + (1 − minShare)·strength), minus `carry` × the local accelerated
water speed. Each slot draws `perBurst` points; a point renders only if its
rank is below that same share, so stronger swipes release more droplets.
The descriptor origin is the finger centre. Each droplet starts on the
**upstream arc** of the touch perimeter: angle ±`arcRadians` from straight up
(against the flow, a fixed seeded `aArc` per point), at `touch.radius × rim`
(radius is the field's Gaussian sigma; rim 2 matches the visible edge of the
opening). It adds a radial `bounce` away from the finger, so water appears to
rebound off the contact rather than leave from inside it.
A full ring overwrites the oldest burst (counted as `overwritten` in the
debug snapshot), bounding cost under any number of fingers. Rebuilding
`slots` reallocates and clears the ring. Context restoration re-flags the
texture for upload; the descriptors stay in CPU memory.

The tracker adds three per-contact arrays parallel to `segments`:
`velocities` (curtain-plane drag, m/s, +x right, +y up, same event-time
window as strength), `sources` (stable slot index), and `began`.
The existing field-strength saturation at 1.25 m/s is kept: phone feedback
reported good feel, and fast swipes are now distinguished by splash volume and
throw, which scale to `fullSpeed` (3 m/s) independently of the field.

**Ballistics / impacts (consumed by M7).** `shaders/particles-common.glsl`
and `src/scene/ballistics.js` define the same contract: gravity
`droplets.gravity` along −Y (artistic, separate from the curtain's flow
gravity), pool surface `POOL_HEIGHT` = 0 = the curtain base,
p(t) = origin + v·t − ½g·t²ŷ, and `impactTime(y0, vy)` = the later root of
y0 + vy·t − ½g·t² = pool. Burst droplets retire at
min(their lifetime, impactTime). Each droplet starts at origin + radial·radius·rim and its velocity is the
slot velocity × (1 − jitter + 2·jitter·seed.x) + radial·bounce·(1 − jitter +
2·jitter·seed.y) + (seed.yzw·2 − 1)·spread·|v|, with z made non-negative;
radial = (sin θ, cos θ, 0), θ = (2·aArc − 1)·arcRadians. M7 makes rings without readback by sampling the same
burst texture: for each live slot it can evaluate the mean trajectory (seed
0.5) or a few representative seeds, compute impactTime, and draw a ring at
the landing xz once uTime passes start + impactTime. Base spray lands on
y=0 along x ∈ ±width·baseSpread/2 at the curtain plane; its loop is
analytic, so M7 may also derive these impacts from time alone.

**Motes.** Dust and mist are sampled in the shared cone's own frame: an
along-axis distance in [alongStart, alongEnd] (mist: its own range), then a
disc whose radius follows the cone half-angle × `spread`. They drift down the
beam and wrap, with `edgeFade` hiding the wrap, and fade out within `wallFade`
metres in front of the undisplaced wall. Dust colour is the dim stone-toned
`dust.color` × `shaftMask` × intensity × `brightness` (subtler than the warm
water sparkle); mist uses `mistColor`. Outside the mask they add exactly zero. `density`
keeps a seeded random subset of the dust capacity live without a rebuild. The visible
shaft volume remains M6.

<a id="m6-shaft"></a>

## M6 volumetric shaft

`createLightShaft()` (`src/scene/LightShaft.js`, `shaders/shaft.frag.glsl`)
draws the visible beam as two fullscreen additive passes of one shader, with
no cone mesh. Per pixel, the shader:

1. Builds the view ray from `cameraPosition` and the live
   `camera.projectionMatrixInverse` / `camera.matrixWorld` (uniforms reference
   the camera's own matrices, so drift/resize need no copies).
2. Intersects the ray with the shared light's forward cone (apex
   `uLightPosition`, axis `uLightDirection`, `uLightCosOuter`). The nappe is
   convex, so the inside set is one interval; a camera inside the cone starts
   at t=0.
3. Clips the interval at the wall: `WallCapture` attaches a `DepthTexture` to
   its (MSAA) target, which Three blit-resolves after the wall pass. The
   shader unprojects (uv, depth) with the same camera, so linearisation and
   near/far come from the projection itself. Depth 1 (no wall) clips at
   `camera.far`.
4. Splits the interval at the resting curtain (analytic bow, two fixed-point
   steps; only inside the sheet rectangle). The **behind** segment draws at
   renderOrder 0, after the background (−1) and before the water (1), so the
   translucent sheet attenuates it. The **front** segment draws at 2.5, before
   the particles (3+). Outside the sheet rectangle the whole ray is "front".
5. Integrates `pow(shaftMask(p), shaft.core) × beamTexture(p) × soft` over
   `shaft.samples` jittered steps (interleaved-gradient per-pixel offset).
   `soft` = smoothstep(0, `softDepth`, wallDistance − t) fades samples close
   to the captured surface. Colour = light colour × light intensity ×
   `shaft.intensity` × integral. Both passes integrate the **whole** interval
   at identical sample positions, separating the part behind the curtain.
   The output transform E (ACES, then sRGB) is concave, so encoding each part
   separately and adding them brightened split pixels: a visible step at the
   curtain outline (checkpoint r1 blocker). The behind pass outputs
   E(behind); the front pass outputs E(behind + front) − E(behind). With
   nothing between them they sum to exactly E(total), and the water still
   attenuates the behind pass. Zero-contribution pixels are discarded.

The beam therefore uses exactly the shared light data (position, direction,
cone, penumbra, axial fade 6→10 m, colour, intensity): moving the light in the
GUI moves the beam, the rock/water lighting and the dust together. The
axial fade ends before the axis reaches the pool. Because brightness is an
integral that shrinks continuously as the ray nears geometry, no surface ever
cuts through a volume mesh, so there are no hard intersection lines; real
occlusion by nearer rock is preserved by the depth clip.

`beamTexture` multiplies radial streaks (value noise in the cone's angular
coordinates, which converge on the source like god rays) with slowly
drifting fBm (`shaft.lacunarity/gain`). Both factors have mean ≈1.
The shaft is not in the wall capture, so refraction never samples it, and
neither pass renders into a texture it reads. Debug views (`shaft.view`)
replace the frame and hide particles: `depth` (wall distance, 25 m = white), `segment` (in-cone
ray length, 6 m = white), `split` (red behind / green front, 4 m = full).
