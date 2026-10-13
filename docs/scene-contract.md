# Scene contract through M8

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

<a id="m7-pool"></a>

## M7 pool, impact rings and low mist

`createPool()` (`src/scene/Pool.js`, layout helpers in `poolLayout.js`) adds a
flat pool plane at y = `POOL_HEIGHT` (0), the curtain base. It spans the wall
width, from just behind the deepest rock recess to past the camera, and draws
in the main scene at renderOrder −0.5: after the background (−1), before the
shaft segment behind the curtain (0) and the water (1). It neither tests nor
writes depth. The curtain therefore composites over the pool where the pool
lies behind the sheet.

**Ripple target.** Each frame, before the wall capture, the pool clears a small
render target and splats every live ring into it as an additive point sprite.
The target covers a fixed rectangle of the pool surface (`rippleHalfWidth`,
`rippleBack`, `rippleFront`) at `rippleResolution` texels per metre: x ∈ ±4.5 m,
z ∈ [−1, 3] m, 864 × 384 at defaults, square texels within 1%. Depth covers the
visible pool in every orientation. Landscape/desktop show about ±7.8 m of pool
sideways, more than droplets reach: a full-strength sideways swipe from the
sheet's edge at mid height lands about 4.1 m out (tested). Rings fade out over
`rippleEdge` (0.25 m) inside the target's edges, so a rarer, harder landing
fades rather than being cut at a seam (M7 r1 blocker). The mapping is u = (x − xMin)/xSize,
v = (z − zMin)/zSize in both the ring shaders and the pool shader. Signed
height is split into R (positive) and G (negative), and B holds crest foam.
This non-negative encoding blends additively in both formats. RGBA16F is
used after a framebuffer-completeness check; RGBA8 (`pool.precision` `byte`,
or automatic fallback) only quantizes and clips at 1. The chosen format is
logged when it changes. The target has no depth, no MSAA and no colour
conversion. Its scene contains only ring sprites, it never samples itself,
and render target/face/mip and autoClear are restored in finally. Context
restoration abandons the lost target; the next configure allocates a new one.

**Ring sources** (`ring-common.glsl`, `ripple.frag.glsl`). Each source is a
one-wavelength wave packet, h = A·sin(2πx)·exp(−2x²), where
x = (d − r)/`ringWavelength`. The radius is r = λ/2 + `ringSpeed`·age, and
A fades as (1 − age/life)² / √(1 + r/λ). A brief foam crest
(`ringFoam`) shows during the first quarter of the ring's life. Sprites are
sized to r + 2λ. If the device's point-size limit clamps a sprite, the
fragment uses the clamped extent, so the ring is clipped rather than
distorted. Three draws feed the target:

1. **Impact line**: `impactRings` looping sources. Each has a seeded period of
   `impactPeriod`·(0.6–1.4) and respawns at a fresh x across the curtain
   width, with z ∈ [0, `impactDepth`] (the bow is zero at the base). It lives
   for min(`ringLife`, period).
2. **Spray**: the spray system's own geometry and uniforms, with the shared
   `spray-launch.glsl` timing and launch. For the latest one or two loops it
   evaluates impactTime(origin.y, v.y). A drop that lands before its flight
   ends (every base drop, and any lip drop whose life is long enough) rings at
   ballistic(origin, v, impactTime) from that moment. Lip drops that retire in
   the air at defaults make no ring.
3. **Bursts**: the burst geometry and descriptor texture, with the shared
   `burst-launch.glsl`. A droplet rings at ballistic(origin, v, impactTime),
   age − impactTime after landing, only if its lifetime reaches the pool.

Droplets and rings compile from the same GLSL source and read the same seeds,
so a ring appears exactly where and when its droplet reaches y = 0. There is
no readback and no CPU particle state. Live rings are bounded by the fixed
point counts: impact + spray + slots × perBurst = 40 + 720 + 3072 vertices at
defaults, most retired. `burst-launch.glsl` also clamps the droplet start
height to the curtain top (the M5 r3 lip nit).

**Pool shading** (`pool.frag.glsl`):

- **Normal**: three slope terms are added together:
  - two octaves of drifting value-noise ripples (`rippleScale`, `rippleSpeed`, `rippleSlope`);
  - churn in a band in front of the base line (`churn`, `churnWidth`, `churnScale`, `churnSpeed`), softened at the sheet's ends by the water's edge width;
  - the ripple-target heights × `ringHeight`, by central differences.
- **Fresnel**: Schlick (`fresnelBase`), scaled by `reflectivity`. The default 1.8 is a deliberate artistic boost: at the physical value 1, the dark rock's reflection reads as a black void.
- **Reflection**:
  - The reflected ray is marched through the rock depth range in `reflectionSteps` planes, from the undisplaced wall back by `rock.relief + rock.ledgeDepth`. It stops at the first plane point that the captured wall depth hides, and that wall-capture pixel is the reflected rock. Rays rise as they go back, so they find rock above the water instead of the submerged rock behind a flat proxy plane.
  - Where the ray crosses the resting curtain (shared `curtain-common.glsl`), the sheet is shaded with the water's own `waterNoise`, `waterCoverage` (now shared from `water-common.glsl`, used unchanged by the water) and lighting, composited over the rock as the water composites over the wall.
  - Reflected points that leave the captured frame fade to the background colour.
  - Not reflected: the touch-field parting, the shaft volume and particles.
- **Body**: `pool.color` × (bounce + shaft mask).
- **Specular**: the shared light's highlight, which is zero at defaults because the beam fades before the pool.
- **Foam**: churn foam above `foamThreshold`, plus ring crests, lit like the rock.
- **Soft shoreline**: alpha = smoothstep(0, `shoreSoftness`, wall distance − pool distance), using the same resolved wall `DepthTexture` as the shaft. The plane never cuts a hard line through rock.
- **Debug views** (`pool.view`): `ripples` (target RGB), `normals`, `reflection`.

**Shared-light integration.**

- The rock's shader fades the rock below the waterline to the pool body colour over `submergeDepth` (when the pool is enabled). The curtain's refraction near its base, which samples the wall capture, therefore shows dark water rather than dry rock.
- With the pool enabled, the shaft's rays end at the pool surface as well as at the rock, with the same soft fade (`softDepth`).
- Moving the shared light moves the beam, rock, water, pool body, foam and low mist together. Aiming the light low lights the pool, its foam and the mist.

**Low mist** (`lowmist.vert.glsl`, `config.mist`) is a fourth additive
particle draw (renderOrder 6). It holds `count` large soft sprites in a thin
layer (y ∈ [`low`, `high`], z ∈ [`back`, `front`]), drifting sideways across
a wrapped band `width` wide, with an edge fade at the wrap and a slow size
swell. They are lit by faint bounce light × `ambient`, plus the shared shaft
mask.

**Behind-curtain attenuation** (`curtain-common.glsl`, closes the M5 nit).
Shaft motes and low mist that lie behind the resting sheet as seen from the
camera are dimmed to `droplets.behindCurtain` (0.55). The sheet outline is
softened by the water's edge width, so a drifting sprite does not pop. The
shaft now shares the same `curtainDistance()`.

<a id="m8-post"></a>

## M8 post-processing, adaptive resolution and saved settings

**Post-processing** (`src/scene/PostProcessing.js`, `shaders/composite.frag.glsl`,
`config.post`) works in **display space**. Every scene material already applies
ACES and sRGB itself, and the water, particles and shaft were tuned blending in
that encoded space. A first version rendered into a linear target and tone
mapped once at the end. Even with every effect at zero, that changed the
approved look: the water turned milky because its alpha blended in linear
light. So when any effect is on:

1. The scene renders into an RGBA16F target (`post.samples` MSAA, default 0)
   flagged `isXRRenderTarget` with an sRGB texture colour space. Three then
   applies renderer tone mapping and encodes exactly as it does for the canvas
   (three.js #27868). The flag's only other use is an 8-bit MSAA format choice,
   which does not apply to a half-float target. Each material tone maps once,
   and the frame is pixel-for-pixel the canvas render, stored in float.
2. Bloom (`UnrealBloomPass` from Three's examples) at `bloomResolution`
   extracts displayed luminance above `bloomThreshold` (0.8). It blurs five
   mips and adds `bloomStrength` × the glow back into the target. Only the
   water glints and the brightest beam/sparkle exceed the threshold.
3. The composite draws to the canvas with `toneMapped: false` and no
   colour-space chunk, so nothing is tone mapped twice. It applies:
   - a vignette: an aspect-corrected radius (1 at the corners) between
     `vignetteStart` and `vignetteEnd`, scaled by `vignetteStrength`;
   - then grain: triangular, zero-mean noise re-seeded `grainRate` times a
     second, × `grainAmount`, faded out below displayed luminance
     `grainShadow` so blacks are not lifted.

Each of `bloom`, `vignette` and `grain` toggles alone. With all three off, or
`post.enabled` off, the scene renders straight to the canvas, the M7 path,
with no target allocated. Without a renderable RGBA16F target (checked once
per allocation), post-processing stays off and logs once. The target always
matches the canvas buffer, so `gl_FragCoord`/`uBufferSize` screen mapping in
the water and pool is unchanged. Context restoration abandons the target and
bloom pass; the next configure builds fresh ones.

**Adaptive resolution** (`src/adaptiveResolution.js`, `config.adaptive`). The
pixel ratio is min(device DPR, `renderer.maxDpr`, 2, adaptive scale), with
scale levels `high`/`mid`/`low` = 2/1.5/1. Every buffer follows that one ratio:
canvas, wall capture, depth, post target and bloom, so pointer mapping (CSS
pixels → curtain UV) is unchanged.

- **Measurement.** Each frame interval goes into a fixed 64-sample ring, with
  no allocation. Twice a second the controller computes:
  - the **mean** interval (1/fps). The median cannot be used: rAF timestamps
    snap to vsync, so frames lost to dropping kept the median at the display
    interval while the page ran at 41 fps.
  - the budget: the display interval estimated from the fastest 10% of
    frames, clamped to [1/`targetFps`, 1/`minRefreshHz`]. A 120 Hz display
    still targets 60 fps; a slow start still counts as slow.
- **Decisions.**
  - Overload (mean > budget × `overloadRatio`) sustained for `sustain` s
    steps down one level.
  - Headroom (mean ≤ budget × `headroomRatio`) for `recover` × backoff s
    steps up one level.
  - A step down within `recover` s of a step up doubles the backoff, up to
    `maxBackoff`. Under a load only 2× cannot sustain, retries therefore
    become rarer instead of oscillating.
  - Measurement restarts, without changing the level, after any resize, pause
    or resume, and for `settle` s after a level change.
- **Testing.** `adaptive.simulateLoad` (debug pages only) busy-waits that many
  ms per megapixel of buffer each frame, to exercise overload and recovery.

**Saved settings** (`src/settings.js`). The debug panel adds:

- **Save settings (this browser + copy).** Stores the changes from the
  shipped defaults (excluding diagnostics) in `localStorage`
  `walden.settings.v1`. It also copies the same JSON to the clipboard and
  shows it in a small panel; pasted to the builder, it can become the shipped
  defaults.
- **Reset to defaults.** Restores every value and forgets the saved settings.

`main.js` captures the shipped defaults, then applies saved settings before
creating the scene, on every page (with or without `?debug`). Values are
validated against this build:
- unknown groups/keys are dropped;
- types must match;
- numbers are clamped to the GUI range;
- choices must be listed and colours must be `#rrggbb`.

Storage failures are caught, so the page renders with defaults.
