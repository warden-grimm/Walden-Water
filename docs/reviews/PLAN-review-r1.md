# PLAN review — revision 1

- Mode: PLAN
- Base SHA: `e03aed336d31985206bfb9be0ea88525cead4d64`
- Reviewed head SHA: `dfa1b7d3d547401092339679980d3747a4c5deff` (verified: `git rev-parse HEAD` in the review checkout)
- Review workspace: Orca child worktree `claude-plan-review`, `C:/Users/Adam Tate/orca/workspaces/Walden-Water/claude-plan-review` (branch `claude-plan-review`, clean before this report)
- Reviewer: Claude
- Verdict: APPROVE WITH NITS
- Advancement: permitted (M1 may start; this does not approve M1)

## Blocking findings

None. The diff (6 docs files, +278/−61) is documentation-only. Ordering, dependency hand-offs (light data in M2 → M3/M5/M6; UV/flow contract in M3 → M4; impact contract in M5 → M7), early checkpoints, and the closed-gate rule (`docs/working-agreement.md:14`, `docs/reviewer.md:47-51`) are sound.

## Non-blocking findings

1. `docs/working-agreement.md:45-105` keeps the original milestone list, which differs from `docs/milestones.md`: light uniforms land in M6 (`:87`) vs M2 (`milestones.md:9,39`), visibility pause in M8 (`:97`), and allocation removal in M9 (`:103`) vs "M9 is not the first profiling pass" (`:43`). No precedence is stated. Remedy: add one line saying `milestones.md` governs scope/checks where the lists differ. Owner: builder. Due: before M1 submission.
2. `docs/goal.md:17` camera idle drift ("breathing" sway) is not assigned to any milestone, and M1 says "fixed camera" (`milestones.md:24`). Drift also affects M4 raycast mapping. Remedy: assign it (e.g., M1 or M8) and add an M4 check that raycasts use the current camera matrices. Owner: builder. Due: before M1 submission.
3. `milestones.md:12,73,119`: the M4 and M9 gates correctly need a real phone, but nobody owns getting one. Without that, M4 deadlocks (safe, but it stalls M5–M9). Remedy: name who provides the device and require it before the M4 submission. Owner: coordinator/user. Due: before M4.
4. `milestones.md:20` / `reviewer.md:47`: "sustained/serious regression" has no threshold. Remedy: define one (e.g., >10% median or p95 at matched settings on the same device). Owner: builder. Due: M2 (first comparison).
5. The early checkpoints (`working-agreement.md:41`, `milestones.md:51,63,89`) have no report name or verdict semantics. Remedy: name them `M<n>-checkpoint-r<k>.md` and mark them non-gating. Owner: coordinator. Due: before the M3 checkpoint.
6. The report path is `M<n>-review-r<revision>.md` (`working-agreement.md:12`), but PLAN reports use `PLAN-…` (`reviewer.md:16`). It is also unstated whether the next `BASE_SHA` is the approved head or the later report commit (`working-agreement.md:15`). Remedy: use `<milestone>` and state "BASE = approved reviewed head". Owner: coordinator. Due: before M1 review.
7. Goal "no perceptible lag" (`goal.md:65`) has no M4 check. Remedy: add an M4 phone observation that splats use the current-frame pointer and don't trail the finger. Owner: builder. Due: M4.

## Evidence and rubric

| Category/check | Status | Command, observation, artifact, or reason |
| --- | --- | --- |
| Scope/spec | PASS | Goal acceptance criteria 1–6 trace to M1–M9; M9 requires a full checklist (`milestones.md:113,119`); the drift gap is nit 2 |
| Shader/field | PASS (plan) | M4 checks target separation, downward transport, byte encoding, renderability, and a forced byte mode (`milestones.md:63-71`, `working-agreement.md:123`) |
| Interaction | PASS (plan) | IDs, capture, cancel/blur, two fingers, hold, and 1–2 s recovery (`milestones.md:67-70`); latency is nit 7 |
| Mobile/lifecycle | PASS (plan) | Context loss and HMR from M1 (`milestones.md:31`, `working-agreement.md:124`); real-phone evidence is required, not inferred (`:73,115`) |
| Performance | PASS (plan) | M1 baseline, per-gate median/p95 (`milestones.md:20`); certification is reserved for M9 on devices. No performance is certified by this review |
| Visual intent | PASS (plan) | Shaft focal point, subdued off-beam water, and a depth-fade checkpoint (`milestones.md:49,89-91`) |
| Maintainability/deployment | PASS (plan) | Config/GUI, `.glsl`, disposal, deps, Pages subpath (`working-agreement.md:109-126`, `milestones.md:117`) |

Environment: PLAN-only, no build/preview/device run (not required). Commands: `git rev-parse HEAD`, `git diff --stat e03aed3..dfa1b7d`, file reads/greps.

## Manual verification (gate audit)

1. Run `git rev-parse HEAD` in the review checkout → `dfa1b7d3…`; the diff touches docs only.
2. Map each `goal.md:141-151` criterion to a milestone check → all map; camera drift does not (nit 2).
3. Trace an M4 blocker: CHANGES REQUESTED → `M4:` fix commit → new head → r2 report → only APPROVE/APPROVE WITH NITS opens the gate (`working-agreement.md:13-14`) → closed.
4. Missing phone or fallback evidence at M4 → blocks (`milestones.md:73`); emulation is excluded (`working-agreement.md:43`).
5. Starter ≠ M1 (`working-agreement.md:5`, `milestones.md:7`) → confirmed.

## Gaps and next gate

No phones, remote, or measurements exist yet; these are expected future evidence, not plan defects. M1 may start. Nits 1, 2 and 6 should be resolved before the M1 submission. M1 advances only on its own exact-SHA review.
