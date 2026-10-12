# M4 device-test deployment

- Site: [Walden Water](https://warden-grimm.github.io/Walden-Water/).
- Diagnostics: [debug view](https://warden-grimm.github.io/Walden-Water/?debug).
- Deployed commit: `6c856e5db73cad7d74e90f4959ab87486bb10607`.
- Reviewed implementation: `e2a45837b75a1f4c0b135c229dd265a682428867`.
- [Successful Actions run](https://github.com/warden-grimm/Walden-Water/actions/runs/38302433649), 2026-10-12: lockfile install, 17 tests, build and Pages deploy pass.

The deployed application source, dependency files, HTML and Vite config are
identical to the reviewed implementation. Later commits record review/evidence
and documentation only. M4 remains unaccepted pending the physical-phone check.

`../deployment-smoke.mjs` and `smoke.json` verify the live URL directly. HTML
matches the local build; the main JS and CSS match SHA256 byte-for-byte. The
normal route has no debug API/GUI and no failure notice. Debug checks deliver two
native CDP touches at 1440×900/DPR1, portrait390×844/DPR2 and landscape844×390/DPR2;
the last forces packed-byte mode. Each produces two active contacts and heals
to zero after release. No browser errors/warnings were observed. Captures were
visually inspected. This is Edge155/Windows desktop emulation, not phone evidence.

The next consumer is the human iPhone tester using the
[M4 phone script](../../../../README.md#m4-candidate-device-check). Record iOS
and browser versions, independent two-finger behavior, slow/fast drag latency
observation, release recovery, rotation/app-switch cleanup and byte comparison.
The reviewer found no code blocker to this device-test publication, but the
milestone gate stays closed until the real-device evidence is reviewed.
