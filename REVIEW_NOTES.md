# Review notes

## PLAN — Milestone and reviewer setup

- **Status:** Revised plan accepted with APPROVE WITH NITS at `4f03b2b1603dce787de74eb63cce298f0d38753e`; see [PLAN-review-r2.md](docs/reviews/PLAN-review-r2.md). All seven original findings are resolved. No implementation milestone is approved.
- **Baseline:** `e03aed336d31985206bfb9be0ea88525cead4d64` records the starter and supplied briefs. The submitted head is in the Orca dispatch.
- **Changed:** Concrete deliverables/checks/evidence for M1–M9; independent review snapshots and stop/fix/re-review gate; repaired broken spec/notes links; Claude prompt, rubric, and report template.
- **Review scope:** `docs/working-agreement.md`, `docs/milestones.md`, `docs/reviewer.md`, and `docs/reviews/TEMPLATE.md`. Check ordering, conformance to `docs/goal.md`, gate scope, and evidence feasibility.
- **Known gaps:** Starter is not M1; no GitHub remote; no target-phone models/evidence; no waterfall shaders/simulation/effects yet.
- **Early risks:** Mobile geometry/overdraw; half-float and encoded-byte fallback; shaft mask before M6; impact contract across M5/M7. Plan names early proof points.
- **Clarifications/deviations:** Existing Vite remains allowed; no dependency added. Lifecycle starts at M1 and performance is checked every milestone; M8/M9 retain final integration/performance gates. M2 establishes light data before the M6 volume. Goal and milestone order unchanged.
- **Validation:** Documentation-only change. Baseline production build and desktop browser/subpath checks passed during setup; this does not count as waterfall acceptance or phone evidence.
- **Plan audit:** (1) Trace goal acceptance to milestones. (2) Follow a blocking M4 finding through fix/review/retest. (3) Confirm exact base/head and separate preview port. (4) Ensure missing phone/fallback evidence cannot become approval. (5) Confirm baseline is not mistaken for M1.

## PLAN — Resolve revision 1 findings

- **Status:** Claude independently verified all seven resolutions in [PLAN-review-r2.md](docs/reviews/PLAN-review-r2.md). This is plan acceptance only, not implementation or performance certification. The original [PLAN-review-r1.md](docs/reviews/PLAN-review-r1.md) is unchanged.
- **Changed files:** `docs/working-agreement.md`, `docs/milestones.md`, `docs/reviewer.md`, and `REVIEW_NOTES.md`. Product goal, milestone order, reviewer reports/template, application code, and dependencies are unchanged.
- **Review baseline:** No accepted implementation milestone exists; M1 uses `e03aed336d31985206bfb9be0ea88525cead4d64`. Later bases are the last accepted reviewed implementation head, not report-only commits; full review documents remain inputs. The revision's exact submitted head belongs in the dispatch.

| PLAN r1 nit | Resolution in this revision |
| --- | --- |
| 1 — Authority | `goal.md` governs the product; `milestones.md` governs operational scope/checks/evidence. The older agreement summary is an outline, not contradictory authority. |
| 2 — Camera drift | M1 owns subtle configurable breathing drift, disabled for reduced motion; fixed means no user orbit. M4 checks current-camera-matrix raycasts during drift and after resize/orientation changes. |
| 3 — Physical devices | Coordinator owns arranging/requesting evidence before M4; user or designated human tester supplies real-device runs. Assignments stay pending until confirmed; M9 requires named recent iPhone/Safari and mid-range Android/Chrome tests. |
| 4 — Regression trigger | Compare accepted baseline/candidate 60-second runs after 10-second warmup on matching device/settings/script/thermal conditions. >10% median OR p95 triggers investigation/documentation; unresolved material regressions block advancement, and reference-quality geometry changes need explicit cost/fidelity review. M9's sustained 60 fps target is unchanged. |
| 5 — Draft checkpoints | Use `M<n>-checkpoint-r<revision>.md` and DRAFT FEEDBACK: non-gating, no milestone approval or advancement. Blocking findings still halt dependent work until resolved. |
| 6 — Report names/base | Generic `<milestone>-review-r<revision>.md` supports PLAN; next base is the last accepted reviewed implementation head, not a report commit. PLAN creates no implementation approval; M1's baseline and full-document inputs are explicit above. |
| 7 — Phone latency | M4 checks current-frame pointer state before field update/render and physical-phone response without visible trailing lag, preferably with slow-motion recording. Record observations/method; numeric latency requires actual measurement. |

- **Outstanding external verification:** Coordinator must confirm human tester(s), phone models, OS/browser versions, and evidence access before M4; all assignments and device availability remain **pending/unconfirmed**. M4 still needs real multi-touch/latency and fallback evidence; M9 still needs named iPhone/Android performance and interaction runs. No phone tests, numeric latency results, or frame-rate certification were produced. Remote/Pages setup remains an external release need.
- **Validation:** All 16 local Markdown links/anchors across 8 Markdown files pass; `git diff --check` passes. Diff scope confirms only the four owned docs changed and the original PLAN report is preserved. No build or device test was run for these documentation-only edits; prior starter checks are not new milestone evidence.
- **Re-review audit:** (1) Compare all seven findings with this table and the revised documents. (2) Trace M1 drift/reduced motion into M4 camera/input ordering and phone observations. (3) Trace the regression trigger and pending phone evidence through the closed gate. (4) Confirm a checkpoint cannot approve advancement. (5) Confirm PLAN/report commits cannot replace M1's baseline and the original report is unchanged.

## Coordinator outcome — PLAN accepted

- **Reviewer workspace:** `claude-plan-review`, `C:/Users/Adam Tate/orca/workspaces/Walden-Water/claude-plan-review`. Separate checkout preserved with both committed reports; reviewer processes released after completion.
- **Orca run:** `run_bd53d2494d9a`. Initial review `task_d98868b19191`, documentation corrections `task_0eb0d69f2afb`, and re-review `task_0f3d648f9976` all completed successfully. These task outcomes do not certify implementation.
- **Accepted plan head:** `4f03b2b1603dce787de74eb63cce298f0d38753e`. Later review/status commits only record the outcome; M1 still uses the documented starter baseline.
- **Remaining nit A:** Extend `docs/reviews/TEMPLATE.md` with CHECKPOINT, DRAFT FEEDBACK, and `not approved by checkpoint`. Owner: coordinator/builder. Due: before the first M3 checkpoint. The reviewer prompt already specifies these values; Claude confirmed this does not weaken the gate.
- **External needs:** Physical testers/devices remain unconfirmed; arrange them before M4 and collect named iPhone/Android evidence for M9. Remote/Pages configuration remains pending for deployment.
- **Next:** M1 implementation may start as a separate milestone, followed by its own build/evidence/commit/Claude review. No M1 work was performed during this plan setup.

## Milestone submission template

### M<n> — <summary>

- Status:
- Last accepted reviewed implementation head (BASE_SHA; use documented baseline for M1):
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
