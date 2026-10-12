# Build: Touch-Interactive Waterfall in a Shaft of Light (Vite + Three.js)

## Goal

Create a single-page, full-screen, real-time 3D scene with Vite and Three.js (latest, ES modules, no framework). A waterfall falls as a thin, translucent curtain in front of a dark, wet, rocky cliff wall. The scene is mostly in darkness, lit by one dim, dusty shaft of light angling down from above. Touching or dragging on the screen pushes and parts the falling water in real time, the way a hand would in a real waterfall.

## Mood &amp; Art Direction

- Overall: quiet, cave-like, cinematic. Low-key lighting with deep shadows and a narrow tonal range. Restrained, not neon.

- Palette: near-black blue-greys for rock and shadow; cool desaturated teal-white for water; a slightly warm, pale gold for the light shaft.

- The light shaft is the focal point. It cuts diagonally from the upper left, hits the upper-middle part of the curtain, and fades out before it reaches the pool. Water inside the shaft glints and sparkles. Water outside it is barely visible: dark, wet streaks with faint specular highlights.

- Floating dust and mist particles drift slowly through the shaft and only show up where the light hits them.

- Fixed camera with a very subtle idle drift (a few cm of slow sway, like breathing). The waterfall fills most of the portrait or landscape frame.

## Scene Components

### 1. Rocky Wall

- A large plane behind the waterfall, displaced procedurally in the vertex shader with layered noise (ridged + fBm) to create ledges, cracks, and overhangs. Use enough subdivision for silhouette detail, about 256×256.

- Fragment shader: wet rock look with dark albedo, noise-driven color variation, moss hints in crevices, and a high-gloss wet sheen in streaks under the curtain. Moving specular streaks should look like water trickling down the rock.

- The wall is mostly in shadow and lit mainly by the shaft and by faint bounce light.

### 2. Water Curtain (core feature)

- A tall, slightly curved ribbon mesh, about 120 wide × 400 tall segments, spanning from a lip near the top of the frame down to a pool. It sits a short distance in front of the wall.

- Custom ShaderMaterial (transparent, depth-write off, additive or premultiplied blending tuned so it reads as water and not glow):

  - Scrolling, stretched vertical noise for streaks and sheets, with speed increasing toward the bottom (gravity).

  - Breakup and holes toward the edges and lower section, so the curtain tears into strands and droplets.

  - Fresnel-based brightness, fake refraction of the wall behind it (offset sampling of a wall render target, or a cheap screen-space distortion), and a sharp specular glint where the light shaft intersects.

- Spawn GPU point sprites along the lip and lower edge for droplets and spray.

### 3. Touch Interaction (most important)

- Use Pointer Events (pointerdown/move/up) with multi-touch support (track each pointerId) and mouse fallback. Set `touch-action: none` on the canvas and prevent scroll and zoom.

- Raycast each pointer onto the curtain surface to get UV coordinates.

- Keep a disturbance field as a ping-pong render target (e.g. 256×512, half-float):

  - Each frame, splat Gaussian impulses at the pointer UVs. Splat strength scales with pointer velocity, and a stationary finger still creates a steady "parting" obstacle.

  - Advect the field downward, so disturbances get carried down with the flow, then diffuse and decay it over about 1–2 seconds.

- In the curtain vertex shader, sample the field to:

  - Push vertices outward (toward the camera and sideways) around the touch, so the water bulges and splits around the finger like an obstacle.

  - Create a visible gap or "shadow" directly below the touch point, where water is deflected and re-joins further down.

- In the fragment shader, use the field to increase foam and whiteness, break up the sheet, and add sparkle around touched areas.

- Emit a burst of splash particles at the touch point, with velocity based on drag direction. The particles arc outward and fall with gravity.

- Interaction should feel immediate (no perceptible lag) and physical: fast swipes slash and scatter the water, while a held finger calmly parts it.

### 4. Light Shaft (volumetric)

- Fake volumetrics: a cone or tapered-box mesh with an additive shader. Brightness falls off along its length and toward its edges, with slow scrolling noise for a dusty, uneven beam.

- Add soft-edge fade where it intersects geometry (depth-based soft particles or a depth-texture fade) to avoid hard clipping lines.

- Use a matching SpotLight (or custom light uniforms) aligned to the shaft, so the rock and water are lit consistently with the beam.

- Optional post-processing pass: screen-space god rays (radial blur from the shaft source) at low intensity.

### 5. Pool &amp; Mist

- A dark pool at the base, with a reflective, slightly rippled surface (normal-map ripples plus expanding rings where the curtain hits the water).

- Splashes from touch interactions that reach the pool spawn small ripple rings.

- A low layer of mist: billboarded soft particles drifting sideways, only faintly visible except where the shaft catches them.

### 6. Post-Processing (keep light)

- Use pmndrs/postprocessing or Three's EffectComposer:

  - Subtle bloom, thresholded so only the shaft and water glints bloom.

  - Gentle vignette and film grain.

  - ACES filmic tone mapping with sRGB output.

- Every pass must be toggleable for performance.

## Tech &amp; Structure

- Vite + vanilla JS (or TypeScript if preferred), Three.js r16x+.

- Suggested file layout:

  - `src/main.js` handles setup, the render loop, and resize.

  - `src/scene/Wall.js`, `WaterCurtain.js`, `LightShaft.js`, `Pool.js`, and `Particles.js` hold the scene components.

  - `src/interaction/TouchField.js` handles pointer tracking, raycasting, and the ping-pong disturbance field.

  - `src/shaders/*.glsl` holds the shaders, imported via `vite-plugin-glsl` or `?raw`.

- Use one `clock`/time uniform shared across all materials.

- Add a `lil-gui` debug panel, hidden by default and shown with `?debug`, with controls for:

  - flow speed, curtain opacity, and touch strength/radius/decay

  - shaft angle/intensity and dust density

  - bloom and the post-processing toggles

## Performance (mobile-first)

- Target 60 fps on a recent iPhone or mid-range Android, and degrade gracefully on weaker devices.

- Cap devicePixelRatio at 2, and use adaptive resolution that drops to 1.5 or 1 if frame time stays above budget.

- Keep all particle and field updates on the GPU, with no per-frame JS allocations.

- Handle resize and orientation change, and recompute the camera framing so the waterfall fills the screen in both portrait and landscape.

- Pause rendering when the tab is hidden.

## Optional Polish

- Ambient waterfall audio loop (Web Audio). It starts on the first touch, to satisfy autoplay policies, and its gain and low-pass filter react to touch intensity.

- A tiny haptic tick (`navigator.vibrate`) on strong swipes, where supported.

## Acceptance Criteria

1. The scene loads with `npm install && npm run dev` and works on desktop (mouse) and mobile (touch, multi-finger).

2. The water reads clearly as a falling translucent curtain, with downward motion, streaks, and breakup at the edges, in front of a visibly 3D, wet, rocky wall.

3. A dim, dusty light shaft is the clear focal point, and the water glints where it passes through the beam.

4. Touching the water visibly parts and deflects it around the finger. The disturbance travels downward and heals over about 1–2 seconds, and swipes throw splash droplets.

5. The page does not scroll or zoom, and there are no console errors.

6. It holds a stable frame rate on mobile.