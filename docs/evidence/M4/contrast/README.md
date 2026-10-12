# M4 contrast follow-up

The user reported on the deployed M4 candidate: "Working great on chrome in iOS No lagging or bugs." They requested slightly darker background rocks and slightly brighter water. Tester: project owner/user; device: previously identified iPhone 15 Pro Max, assumed same device for this follow-up; browser/OS: Chrome on iOS, versions not supplied. This is qualitative positive device feedback, not numeric latency/FPS data or an explicit account of every phone-script check. In particular, a two-finger run and forced-byte phone check were not individually reported. The contrast revision itself has not yet been tested by the user.

Only three existing visual settings change: rock `#525c66` → `#4b555e`, water `#88adb7` → `#9cbdc6`, and curtain opacity `0.36` → `0.40`. Wet highlights, shared light, exposure and all interaction settings stay the same. The water remains translucent and brighter in the illuminated area; rocks retain visible wet ledges and crevices.

Run `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`, open isolated Edge with CDP on 9333, then `node docs/evidence/M4/contrast-verify.mjs`. No dependencies added. The script uses the debug API to compare old/new settings with camera drift and flow/trickle speeds frozen. Each before/after pair has the same geometry, framing and flow phase. Animation is restored for the two-contact smoke.

- Portrait: 390×844 CSS pixels, DPR2, automatic half-float field.
- Landscape: 844×390 CSS pixels, DPR2, forced packed-byte field.
- `*-before.png` / `*-after.png`: matched visual comparisons.
- `*-touch-*.png`: two held contacts after tuning.
- `smoke.json`: actual snapshots, two contacts and pressure >0.8 in both modes, zero contacts/exact neutral after 2.2 seconds, no console warnings/errors.

These are Windows/Edge emulation checks, not physical iOS tests. No shader, geometry, render-pass, allocation or texture-size change; existing M4 cost measurements still describe the pipeline. No new performance claim is made from the short smoke.
