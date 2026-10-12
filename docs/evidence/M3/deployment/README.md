# First GitHub Pages deployment

- Date: 2026-10-12.
- User authorized pushing and publishing accepted M3 before beginning M4.
- Public repository: https://github.com/warden-grimm/Walden-Water
- Site: https://warden-grimm.github.io/Walden-Water/
- Diagnostics: https://warden-grimm.github.io/Walden-Water/?debug
- Deployed commit: `b8e91e1901de8472baf1c09c98ce2b5e7ac602a3`.
- Successful workflow: https://github.com/warden-grimm/Walden-Water/actions/runs/38289697290
- Accepted application head remains `a4b55164809c009fbb12b7d10929150ebc3ce3b0`;
  application sources, dependencies, public assets and Vite config are identical.
  Deployment adds CI tests and README links/device instructions.

GitHub Actions installed dependencies, passed 10 tests, built the site and
deployed the Pages artifact. HTTPS is enforced. The public HTML, icon, CSS,
main JavaScript and lazy debug JavaScript all returned HTTP 200 and matched
the local production files by SHA-256.

Live-site browser checks used isolated native Edge 155 on Windows. Screenshots
and `smoke.json` cover desktop 1440×900/DPR1, portrait 390×844/reported DPR3
(drawing DPR capped to 2), and landscape 844×390/DPR2. Each debug view advanced
frames with 3 draws / 227,074 triangles, one canvas and no error notice. The
ordinary URL had no debug API. No runtime, shader, console or network errors
were observed in the completed probe. These are desktop emulations, not
physical-phone certification.

The first probe stopped when it tried to serialize lil-gui's return value from
`hidePanel()`. Using `void` for that call fixed the probe; no application change
was necessary. The isolated smoke-test browser was closed afterward.

This evidence-only commit uses `[skip ci]`; the successful deployment above
remains the live artifact. Future ordinary pushes to `master` run tests and
deploy automatically. M4 has not begun.
