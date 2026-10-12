# Walden Water

A static Three.js page using plain JavaScript, Vite, and GitHub Pages. The starter includes a rotating placeholder sculpture, orbit controls, responsive rendering, a motion toggle, and a WebGL fallback message.

## Waterfall build and review

The waterfall specification is in [docs/goal.md](docs/goal.md). Follow the ordered [milestone plan](docs/milestones.md) and [working agreement](docs/working-agreement.md). Each milestone stops for independent Claude review in a separate Orca workspace, using [the reviewer prompt](docs/reviewer.md). Record evidence and findings in [REVIEW_NOTES.md](REVIEW_NOTES.md). The current starter is a baseline, not an approved M1.

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
  main.js                     Page startup, controls, fallback, hot reload cleanup
  styles.css                  Page layout and styling
  scene/
    createScene.js            Renderer, camera, lights, animation loop, cleanup
    objects/
      createDemoObject.js     Replaceable example mesh with update/dispose methods
  shaders/                    Custom GLSL shaders
index.html                    HTML entry point and accessible page content
vite.config.js                Portable relative asset paths
package.json                  Dependencies and development commands
```

Start scene work in `src/scene/objects/`; assemble objects in `createScene.js`. Keep page content in `index.html` and styling in `styles.css`. Dispose of new geometries, materials, textures, and controls when their owning scene is removed. Automatic motion respects the visitor's reduced-motion preference; rendering pauses in background tabs.

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

1. Create or choose a GitHub repository, add it as the `origin` remote, and push this project to its default branch (`main` or `master`).
2. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
3. Open **Actions → Build and deploy to GitHub Pages** and run the workflow on the default branch. Future pushes to that branch deploy automatically. Pull requests build without deploying.
4. The deployment URL appears in the workflow's `github-pages` environment.

The workflow installs the lockfile with `npm ci`, builds `dist/`, and publishes it with the official Pages actions. It uses the built-in `GITHUB_TOKEN`; no personal access token is required. Deployment permissions are limited to the deployment job. Both `main` and `master` trigger builds, but only the repository's default branch can deploy.

`base: './'` keeps the build usable at `https://<owner>.github.io/<repository>/`, at a user/organization Pages root, or on a custom domain. No repository name is hardcoded. This is a single HTML page; add separate HTML entries or use hash navigation if routing is introduced later.

The repository is currently local: configuring an origin remote and enabling Pages are still required before the first deployment.

References: [Vite relative base paths](https://vite.dev/guide/build.html#relative-base), [Vite GitHub Pages deployment](https://vite.dev/guide/static-deploy.html#github-pages), [Three.js documentation](https://threejs.org/docs/).
