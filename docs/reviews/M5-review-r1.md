# M5 review — revision 1

- Mode: MILESTONE
- Base SHA: `86f9fd594e98719b8b0f059e4267c0c29cdad09a` (accepted M4 source; `f98a80d` is a docs-only descendant)
- Reviewed head SHA: `f412dac527fe2827de2fb401e20daf1ad1144044` (`git rev-parse HEAD` verified)
- Review workspace: `scratchpad/m5-review` (detached worktree at HEAD), preview `http://127.0.0.1:5176/` (`--strictPort`)
- Reviewer: Claude
- Verdict: **CHANGES REQUESTED**
- Advancement: blocked

## Blocking findings

1. **Every HMR now disables touch, and with it the bursts.** `src/main.js:131` (new `WebGLRenderer` on the reused canvas/context), exposed by `src/scene/Particles.js:324` (additive ONE,ONE blending as the last draw).
   - **Problem:** HMR builds the new renderer on the same WebGL context. Three's fresh state cache assumes blending is off, so `NoBlending` never calls `gl.disable(BLEND)`. The GL context keeps the old frame's last blend state. In M4 that was premultiplied ONE,ONE_MINUS_SRC_ALPHA, and the validation probe writes alpha=1, so the leak did no harm. In M5 the last draws are additive ONE,ONE. The three probe draws into the 1×1 probe target therefore accumulate, and `TouchField.allocate` rejects both half-float and byte. The result is `[Walden] Touch disabled: No usable touch field framebuffer/sampling path` after every hot update, with no field, parting or bursts until a full reload.
   - **Reproduction:** `review-scratch/hmr2.mjs`, `hmr3.mjs`, `hmr4.mjs` touch the mtime of `src/main.js` or `src/scene/createScene.js`; file content is unchanged.
     - M4 copy (port 5177): touch stays available after every HMR (4 geometries, 3 textures, 4 programs).
     - M5: `touch.available=false`, textures 4→3, draws 7→6.
     - Bisect: with spray, bursts and dust all disabled before the HMR, validation passes. Any one enabled `Points` system makes it fail.
     - A wrapped `readPixels` shows `BLEND` enabled with src=1/dst=1 and probe bytes accumulating (32,64 → 159,191). Forcing `gl.disable(BLEND)` before validation (`hmr5.mjs`) makes it pass.
   - **Consequence:** Breaks the HMR lifecycle requirement (working agreement; M1 check 4). The builder evidence did not cover HMR in M5.
   - **Minimal fix:** call `renderer.resetState()` right after constructing the renderer in `main.js`. This resets the real GL state to match Three's cache. Alternatively, call it in `dispose()` before `renderer.dispose()`.
   - **Retest:** three HMR cycles each on `main.js`, `createScene.js` and `Particles.js`. Touch must stay available in auto and byte modes, with stable geometries/textures/programs (7/4/7), one canvas, and bursts still emitting.

## Non-blocking findings

- **A held finger with small jitter keeps spraying.** At 844×390, ±1 CSS px random jitter (15 Hz delivered moves) gave 25 bursts in 3 s; ±2 px gave 40. At 390×844, ±2 px gave 15 and ±1 px gave 1. The builder's held-finger evidence used a perfectly still synthetic contact. Real phones deliver events faster (a shorter window makes the speed estimate higher). Emission stays bounded, but "a held finger calmly parts it" is not demonstrated. Add a small displacement deadband, or raise `bursts.minSpeed` relative to on-screen curtain scale, and confirm on the phone. Owner: builder. Due: M5 resubmission phone check.
- **10-finger saturation overwrites bursts in flight.** A 60 s stress run emitted 7531 bursts and overwrote 7435; the ring was full at 96. At about 107 bursts/s a slot is reused after about 0.9 s, while droplets fly about 1.2–1.6 s, so some are cut off abruptly. The total stays bounded, and 4 fingers never hit this (builder: 71/96). Consider a global emit-rate cap or reusing the slot nearest its end of life. Owner: builder. Due: M9 presets.
- **Lip spray can fall through the pool.** Lip spray retires only at `lipLife × vary`. It never reaches y<0 at defaults, but the GUI range (lipLife up to 3 s) lets drops fall through the pool. Clamp it with `impactTime` as bursts do, so M7 can rely on the contract. Owner: builder. Due: M7.
- **Hard-coded distribution constants in the shaders.** These include the `0.25 × uFadeShare` rise, mist size `0.6 + 0.8·aVary`, dust `0.5 + aVary`, and lip forward `0.5 + fresh.w`. They are disclosed, and they are arguably art spreads rather than identities. Promote the rise share and the size spreads to uniforms or document each one. Owner: builder. Due: M9.
- **Motes are not attenuated by the curtain.** Motes and mist between the wall and the curtain draw at full strength over translucent water (`depthTest=false`, additive). Mist sprites also take the mask from their centre only, so up to about half a sprite (around 0.3 m) can spill past the cone edge, though softly. Revisit with the M6 depth fade. Owner: builder. Due: M6.

## Evidence and rubric

| Category/check | Result | Command, observation, artifact |
| --- | --- | --- |
| Scope/spec | PASS | Diff is limited to particles/emitter/tracker arrays/config/contract; analytic GPU evaluation deviation documented; no M6/M7 work. |
| Shader/field | PASS | Field untouched; tracker adds parallel arrays only. Burst texel centres, impact root, retire-off-clip and the soft profile were reviewed. The 22/22 tests include the impact-root check. |
| Directional arcs | PASS | `direction.mjs` with the curtain, sheen, spray, dust and drift isolated. In portrait the burst centroid sits +87/−85 px for right/left swipes, −14/+152 px for up/down. Landscape: +81/−58, −58/+93. 7 bursts per swipe; 0 live 2.3 s later. |
| Held finger / bounded | PASS (bounded) / UNVERIFIED (calm on phone) | A still hold emits exactly 1 press burst. A slow drag emits 1. With jitter, see the first nit. The ring is fixed at 96×2 RGBA32F. |
| Interaction regression | PASS | Byte mode: 10 bursts, RGBA8 packed16. With touch disabled: 0 bursts. With bursts disabled: 0 bursts and the system hidden. A hidden page clears contacts. Two context restores: bursts resume, no warnings. |
| Mobile/lifecycle | **FAIL** | HMR disables touch (blocker 1). Context loss/restore, visibility and GUI rebuilds pass. Changing slots/perBurst/count/capacity/mistCount mid-flight keeps 7 geometries, 4 textures and 7 programs. |
| Performance | PASS (desktop) | Idle: M4 16.7/16.8 vs M5 16.7/16.8 ms median/p95, GPU 3.30→3.37 ms. 10-finger stress: 17.3/18.1 vs 17.6/18.1 (+1.7%/0%), GPU 3.53→3.55 ms. Trigger not fired. CPU submission 0.1→0.2 ms. Source inspection found no allocations in `update` paths; the texture uploads only when a burst spawns. No per-frame readback. |
| Visual intent | PASS (desktop) | Faint lip/base spray, soft round droplets, motes only in the beam, and these follow a moved light. Additive blending avoids sorting artifacts. Phone look: UNVERIFIED. |
| Maintainability/deployment | PASS with nits | Config/GUI groups; rebuild keys are labelled and dispose old geometry; the M7 contract is documented with no readback; shader constants are covered in the nits. |

Environment: Windows 11, isolated Edge 155 (CDP 9333) with touch emulation, desktop GPU. 1440×900 DPR1 for timing; 390×844 and 844×390 DPR2 for behaviour. `npm ci` OK; `npm test` 22/22; `npm run build` OK (592.48 kB, existing >500 kB warning). Scripts and outputs are in `review-scratch/` (untracked). No physical phone.

## Manual verification

1. Reload, swipe fast left→right and then right→left. Expected: droplets arc in the swipe direction and toward the viewer, then vanish within about 1.5 s.
2. Hold one finger for 3 s without consciously moving it. Expected: one small splash, then no more droplets. **Phone, both orientations.**
3. Swipe with four or more fingers for 60 s. Expected: no growing cloud and no slowdown. **Phone.**
4. In `?debug`, move `light.x`/`targetX`. Expected: dust and mist follow the beam, and the old region goes dark.
5. In dev, save `src/main.js` three times. Expected: touch, parting and bursts all keep working (currently they fail).

## Gaps and next gate

Phone droplet look, cost and the held-jitter behaviour are UNVERIFIED. The visible shaft (M6) and pool rings (M7) are expected gaps. Advancement requires fixing blocker 1 and retesting it on a new exact head. The nits need owners and dates as listed.
