# PLAN review — revision 2

- Mode: PLAN
- Base SHA: `e03aed336d31985206bfb9be0ea88525cead4d64`
- Reviewed head SHA: `4f03b2b1603dce787de74eb63cce298f0d38753e` (verified: `git rev-parse HEAD` in the review checkout)
- Prior reviewed plan: `dfa1b7d3d547401092339679980d3747a4c5deff` ([PLAN-review-r1.md](PLAN-review-r1.md), report-only commit `fa7c08de48789354f1910a59bafe80ba2d9bbdc3`)
- Review workspace: Orca child worktree `claude-plan-review`, `C:/Users/Adam Tate/orca/workspaces/Walden-Water/claude-plan-review` (branch `claude-plan-review`, clean before this report)
- Reviewer: Claude
- Verdict: APPROVE WITH NITS
- Advancement: permitted (the plan is accepted and M1 may start; this does not approve M1)

**No implementation, device, or performance approval is granted by this review.** It certifies no code, no phone or multi-touch behavior, no latency, and no frame rate. Phone evidence does not exist yet. That is expected, and it remains a hard gate at M4 and M9.

## Blocking findings

None. Fix commit `4f03b2b` touches only `REVIEW_NOTES.md`, `docs/milestones.md`, `docs/reviewer.md`, and `docs/working-agreement.md` (+56/−21). `docs/goal.md`, `docs/reviews/PLAN-review-r1.md`, `docs/reviews/TEMPLATE.md`, application code, and dependencies are unchanged since `dfa1b7d`/`fa7c08d`. The baseline diff `e03aed3..4f03b2b` contains only docs and `README.md`.

## Disposition of PLAN-review-r1 findings

| r1 nit | Disposition | Verified prose |
| --- | --- | --- |
| 1 — Conflicting milestone lists / no precedence | **Resolved** | Precedence is stated in all three places: `working-agreement.md:3`, `milestones.md:3`, and `reviewer.md:19`. `goal.md` governs the product, and `milestones.md` governs operational scope, checks, and evidence. The older outline is "not a competing authority or a reason to defer work assigned earlier there", so the M6 light uniforms (`working-agreement.md:91`), the M8 visibility pause (`:101`), and the M9 allocation pass (`:107`) cannot override the earlier assignments. |
| 2 — Camera drift unassigned | **Resolved** | M1 now delivers subtle, configurable breathing drift and defines "fixed" as "no user orbit" (`milestones.md:29`). Check 5 and the evidence clip are at `:37,39`. M4 check 1 requires raycasts against the current camera matrices while drift is running and again after resize or orientation change (`:73`), and the evidence includes drift/raycast alignment (`:80`). The rubric covers this at `reviewer.md:43`. The reduced-motion disable is a sensible accessibility addition. It is consistent with `goal.md:17` and does not contradict it. |
| 3 — No owner for physical phones | **Resolved (assignment pending, as expected)** | The coordinator now arranges or requests the evidence before M4, and the user or a designated human tester supplies the runs (`milestones.md:13`, `working-agreement.md:47`, `reviewer.md:57`). Assignments are explicitly pending or unconfirmed in `REVIEW_NOTES.md`, and no device is presumed. M9 requires named iPhone/Safari and Android/Chrome testers (`milestones.md:122`). This is an external dependency, not a plan defect. |
| 4 — Regression threshold undefined | **Resolved** | The matched-run protocol starts at M2: same device, browser, viewport, DPR, effects, script, and thermal conditions, with 60 s runs after a 10 s warmup (`milestones.md:23`). A rise of more than 10% in median OR p95 triggers investigation and documentation. Unresolved material regressions block advancement (`:23`, `reviewer.md:51`, `working-agreement.md:45`). The M9 sustained 60 fps target is unchanged. The gate is not weakened: the old wording was "serious measured regression", and the new one adds a concrete trigger with a mandatory disposition. |
| 5 — Checkpoint naming and semantics | **Resolved** | Checkpoints are named `M<n>-checkpoint-r<revision>.md` and carry **DRAFT FEEDBACK** (`milestones.md:25`, `working-agreement.md:43`, `reviewer.md:16,25`). They are non-gating and never permit advancement, and blocking findings still halt dependent work. See nit A for the template. |
| 6 — Report naming / next BASE_SHA | **Resolved** | Reports use the generic name `<milestone>-review-r<revision>.md`, with `<milestone>` ∈ {PLAN, M1–M9} (`working-agreement.md:12`). The next BASE is the last accepted, reviewed implementation head and never a report-only commit (`working-agreement.md:11`, `reviewer.md:10,21`, `REVIEW_NOTES.md` template). PLAN/M1 use `e03aed3`, and PLAN creates no implementation approval. |
| 7 — No M4 latency check | **Resolved** | M4 check 6 requires current-frame pointer state to be consumed before the field update and render. It also requires a physical-phone observation of no visible trailing lag, preferably on slow-motion video, and allows a numeric figure only when actually measured (`milestones.md:78`). Missing latency evidence blocks M4 (`:80`, `reviewer.md:57`). |

The `REVIEW_NOTES.md` resolution table matches the document prose for all seven items. I found no overstated claim.

## Non-blocking findings

- **A.** `docs/reviews/TEMPLATE.md` still lists only `Mode: PLAN / MILESTONE`, the three standard verdicts, and `Advancement: blocked / permitted`. `reviewer.md:25` tells checkpoint reports to use CHECKPOINT, **DRAFT FEEDBACK**, and "not approved by checkpoint". The `reviewer.md` instruction is explicit, so this does not cause confusion that could open a gate. Add the checkpoint values to the template. Owner: coordinator/builder. Due: before the first M3 checkpoint.

No other contradictions, weakened gates, or regressions were introduced. I raise no preference-only items.

## Evidence and rubric

| Category/check | Status | Command, observation, artifact, or reason |
| --- | --- | --- |
| Scope/spec | PASS | The fix is limited to four docs. The goal and r1 report are unchanged (`git diff --stat dfa1b7d 4f03b2b -- docs/goal.md docs/reviews` shows only the r1 report added at `fa7c08d`). Every `goal.md` acceptance item, including idle drift (`:17`) and "no perceptible lag" (`:65`), now traces to a milestone check. |
| Shader/field | PASS (plan) | The M4 field checks are unchanged and intact (`milestones.md:73-80`). |
| Interaction | PASS (plan) | Drift-aware raycasts, current-frame pointer ordering, and the phone lag observation are added (`milestones.md:73,78`, `reviewer.md:43`). |
| Mobile/lifecycle | PASS (plan) | Reduced-motion handling is in M1 (`milestones.md:29,37`). Phone evidence owner and recording rules are set (`:13`). Emulation is still excluded. |
| Performance | PASS (plan) | There is a concrete matched-run trigger from M2, and unresolved material regressions block. M9 still requires sustained 60 fps on named devices. Nothing is measured or certified here. |
| Visual intent | PASS (plan) | Unchanged from r1. Drift must preserve framing (`milestones.md:37`). |
| Maintainability/deployment | PASS (plan) | Drift is configurable via `config.js`/GUI, and the naming and base rules are consistent across documents. The template gap is nit A. |

Environment: PLAN-only. There was no build, preview, or device run, and none was required for a docs-only review. Commands run: `git rev-parse HEAD` → `4f03b2b1603dce787de74eb63cce298f0d38753e`; `git diff --stat fa7c08d 4f03b2b` (4 docs files); `git diff --name-only e03aed3 4f03b2b` (docs and README only); `git diff --check e03aed3 4f03b2b` (clean); and a grep and read of every cited line. I also confirmed that the anchor `milestones.md#evidence-at-every-gate` resolves to the `## Evidence at every gate` heading.

## Manual verification (gate audit)

1. HEAD equals `4f03b2b…`. The fix diff contains docs only. `goal.md`, the r1 report, the template, code, and dependencies are untouched.
2. M1 drift with reduced-motion handling → M4 current-matrix raycasts during drift, resize, and orientation change → phone latency observation. The chain is complete, and missing evidence blocks M4.
3. Regression >10% on median or p95 → investigate and record in `REVIEW_NOTES.md` → advancement blocked while it is unresolved. The M9 60 fps target is unchanged.
4. An M3/M4/M6 checkpoint gives DRAFT FEEDBACK. It cannot approve or advance, and its blockers still halt dependent work.
5. A PLAN or report-only commit cannot become BASE. M1 uses `e03aed3`, and later milestones use the last accepted reviewed implementation head.

## Gaps and next gate

There are no phones, testers, remote, or measurements yet. Tester and device assignments are pending with the coordinator and must be confirmed before the M4 submission. M4 and M9 stay closed without real-device evidence. The plan is accepted. M1 may start and advances only on its own exact-SHA review. This approval covers only the plan documents at `4f03b2b`.
