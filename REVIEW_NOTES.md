# Review notes

## PLAN — Milestone and reviewer setup

- **Status:** Submitted for independent Claude plan review; no implementation milestone approved.
- **Baseline:** `e03aed336d31985206bfb9be0ea88525cead4d64` records the starter and supplied briefs. The submitted head is in the Orca dispatch.
- **Changed:** Concrete deliverables/checks/evidence for M1–M9; independent review snapshots and stop/fix/re-review gate; repaired broken spec/notes links; Claude prompt, rubric, and report template.
- **Review scope:** `docs/working-agreement.md`, `docs/milestones.md`, `docs/reviewer.md`, and `docs/reviews/TEMPLATE.md`. Check ordering, conformance to `docs/goal.md`, gate scope, and evidence feasibility.
- **Known gaps:** Starter is not M1; no GitHub remote; no target-phone models/evidence; no waterfall shaders/simulation/effects yet.
- **Early risks:** Mobile geometry/overdraw; half-float and encoded-byte fallback; shaft mask before M6; impact contract across M5/M7. Plan names early proof points.
- **Clarifications/deviations:** Existing Vite remains allowed; no dependency added. Lifecycle starts at M1 and performance is checked every milestone; M8/M9 retain final integration/performance gates. M2 establishes light data before the M6 volume. Goal and milestone order unchanged.
- **Validation:** Documentation-only change. Baseline production build and desktop browser/subpath checks passed during setup; this does not count as waterfall acceptance or phone evidence.
- **Plan audit:** (1) Trace goal acceptance to milestones. (2) Follow a blocking M4 finding through fix/review/retest. (3) Confirm exact base/head and separate preview port. (4) Ensure missing phone/fallback evidence cannot become approval. (5) Confirm baseline is not mistaken for M1.

## Milestone submission template

### M<n> — <summary>

- Status:
- Previous approved SHA:
- What changed:
- Build command/result:
- Preview command/URL/port:
- Environment and evidence paths:
- Manual steps/expected results:
- Performance baseline/comparison:
- Known gaps:
- Deviations/reasons:
- Review report/reviewed SHA:
- Blocker disposition/retest:
- Remaining nits (owner/due milestone):
