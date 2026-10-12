# Walden Water

A static Three.js page using plain JavaScript, Vite, and GitHub Pages. Accepted M3 includes a curved falling water curtain, accelerated streaks, wall refraction and localized glints over a displaced wet rock wall. The M4 device-test candidate adds multi-touch parting, downward wakes and rim foam, with a contrast adjustment following positive Chrome-on-iOS feedback. Claude found no code blocker to publication; acceptance still requires explicit confirmation of simultaneous two-finger use on the phone. Spray, the visible light volume and the pool follow in later milestones.

## Waterfall build and review

The waterfall specification is in [docs/goal.md](docs/goal.md). Follow the ordered [milestone plan](docs/milestones.md) and [working agreement](docs/working-agreement.md). Each milestone stops for independent Claude review in a separate Orca workspace, using [the reviewer prompt](docs/reviewer.md). Current acceptance, evidence, and findings are recorded in [REVIEW_NOTES.md](REVIEW_NOTES.md).

## Local development

Use Node.js 24 or newer and npm. `.nvmrc` selects Node 24 for development and CI.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Changes reload automatically.

```sh
npm run build    # Generate the static site in dist/
npm run preview  # Serve the production build locally
npm test         # Framing, clock, light contract, and diagnostic lifecycle checks
```

Commit `package-lock.json` when dependencies change. `node_modules/` and `dist/` are generated and ignored by Git.

## Repository layout

```text
.github/workflows/deploy.yml   Build checks and GitHub Pages deployment
public/
  favicon.svg                 Site icon
  models/                     GLB/GLTF files copied without bundling
  textures/                   Images and environment maps copied as-is
src/
  main.js                     Renderer, loop, resize, fallback, lifecycle ownership
  config.js                   Implemented tunables and GUI ranges
  time.js                     Shared simulation timeline/uniform
  debug/                      Lazy-loaded lil-gui and bounded frame-time sampling
  interaction/                Pointer tracking, resting contacts and TouchField
  styles.css                  Page layout and styling
  scene/
    createScene.js            Scene assembly and resource ownership
    Wall.js                   Displaced rock, shader uniforms, quality rebuilds
    WaterCurtain.js            Curved ribbon and falling water material
    WallCapture.js             Isolated wall target for background and refraction
    camera.js                 Fixed framing and breathing drift
    framing.js                Camera distance and adaptive backdrop coverage
    light.js                  Shared world-space shaft light uniforms
  shaders/                    Custom GLSL shaders
index.html                    HTML entry point and accessible page content
vite.config.js                Portable relative asset paths
package.json                  Dependencies and development commands
```

Assemble scene components in `createScene.js`; extend `config.js` as each feature arrives. Keep page content in `index.html` and styling in `styles.css`. Dispose of new geometries, materials, and textures when their owning scene is removed. Camera motion respects the visitor's reduced-motion preference; rendering and the shared timeline pause in background tabs.

Append `?debug` to open the tuning panel. Its Diagnostics folder offers a fixed 10-second warmup plus 60-second frame-time sample and context loss/restoration controls. The debug-only `window.__WALDEN_DEBUG__` exposes `snapshot()`, `sample()`, and `sampleStatus()` for reproducible evidence; the last returns raw frame intervals plus median/p95, CPU render submission time, and asynchronous GPU timing when supported. Changing settings, viewport, visibility, or motion preference cancels an active sample. The GUI, query pool, and sample buffers are absent without `?debug`; these measurements do not certify physical-phone performance.

The wall folder offers reference/reduced geometry, separate displacement and wet-sheen toggles (sheen is in the wet folder), and normal/light/wet mask views. Controls labelled **rebuild** recreate and dispose geometry after editing. All implemented tunables are in `src/config.js`. See the [scene contract](docs/scene-contract.md) for world coordinates, normal math, resource ownership, and the shared light API that later milestones must reuse.

## Assets and shaders

Files in `public/` are served from the site root. Build URLs with Vite's base so they also work at a GitHub Pages repository path:

```js
const modelUrl = `${import.meta.env.BASE_URL}models/example.glb`;
const textureUrl = `${import.meta.env.BASE_URL}textures/water.webp`;
```

Do not start these URLs with `/models/` or `/textures/`; that would bypass the repository path. Assets imported from `src/` are processed by Vite. Import GLSL source as text without an extra plugin:

```js
import vertexShader from './shaders/water.vert.glsl?raw';
```

## GitHub Pages

- Site: [Walden Water](https://warden-grimm.github.io/Walden-Water/)
- Device diagnostics: [debug view](https://warden-grimm.github.io/Walden-Water/?debug)
- Repository: [warden-grimm/Walden-Water](https://github.com/warden-grimm/Walden-Water)
- Deployment status: [GitHub Actions](https://github.com/warden-grimm/Walden-Water/actions/workflows/deploy.yml)

1. Create or choose a GitHub repository, add it as the `origin` remote, and push this project to its default branch (`main` or `master`).
2. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
3. Open **Actions → Build and deploy to GitHub Pages** and run the workflow on the default branch. Future pushes to that branch deploy automatically. Pull requests build without deploying.
4. The deployment URL appears in the workflow's `github-pages` environment.

The workflow installs the lockfile with `npm ci`, runs `npm test`, builds `dist/`, and publishes it with the official Pages actions. It uses the built-in `GITHUB_TOKEN`; no personal access token is required. Deployment permissions are limited to the deployment job. Both `main` and `master` trigger builds, but only the repository's default branch can deploy.

`base: './'` keeps the build usable at `https://<owner>.github.io/<repository>/`, at a user/organization Pages root, or on a custom domain. No repository name is hardcoded. This is a single HTML page; add separate HTML entries or use hash navigation if routing is introduced later.

## Rendering checks carried forward from M3

Use the published Pages URL in Safari or Chrome directly, then repeat with `?debug` to access diagnostics. Record the device model, OS/browser versions, orientation and any changed quality settings alongside screenshots or a short recording.

1. Watch at least ten seconds in portrait and landscape. Flow should move downward and accelerate; the rock should remain visible through the water. The lip and base should stay in frame.
2. Switch away from the browser and return. Rendering should resume without a large animation jump. Check for unwanted page scrolling or pinch zoom.
3. Open **Diagnostics → Sample: 10s warmup + 60s**. Keep the tab visible and the orientation/settings unchanged for the full 70 seconds; record the resulting frame median/p95 and GPU timing when available.
4. Compare the curtain's reference/reduced quality, refraction's full/half `wallResolution`, and auto/byte precision. Reload to restore defaults. The half-resolution option softens the entire wall background.

These rendering checks do not replace M4's multi-touch/latency review or M9's final phone certification. Test interaction with the M4 script below.

## M4 candidate device check

Use the [Pages candidate](https://warden-grimm.github.io/Walden-Water/), reloading
after the M4 deployment completes. Check the Actions link above for deployment status.
Record tester, device model, OS and browser versions, and whether each check passes.

1. In portrait, hold one finger on the curtain for three seconds, add a second,
   then lift each separately. Each opening should follow its own finger; after
   release the wake should travel down and heal in about one to two seconds.
2. Drag slowly, then quickly, at the top, centre and corners. Observe whether
   parting stays under contact without visible trailing lag. A short external
   slow-motion recording is useful; a direct observation is acceptable. Report
   numeric latency only if it was measured.
3. Repeat in landscape and rotate while holding. Switch apps while touching,
   return, and touch again. No stuck opening, unintended scroll or zoom should remain.
4. In `?debug`, set **touch → precision** to **byte**, hide the panel if needed,
   and repeat the two-finger and drag checks. The opening and recovery should
   remain comparable. **touch → overlay** exposes the field; reload for defaults.

M4 acceptance requires this real-phone evidence and Claude's exact-commit review.

References: [Vite relative base paths](https://vite.dev/guide/build.html#relative-base), [Vite GitHub Pages deployment](https://vite.dev/guide/static-deploy.html#github-pages), [Three.js documentation](https://threejs.org/docs/).
