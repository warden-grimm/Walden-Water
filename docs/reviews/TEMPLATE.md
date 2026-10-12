# <Milestone> review — revision <n>

- Mode: PLAN / MILESTONE / CHECKPOINT
- Base SHA:
- Reviewed head SHA:
- Review workspace:
- Reviewer: Claude
- Verdict: APPROVE / APPROVE WITH NITS / CHANGES REQUESTED / DRAFT FEEDBACK
- Advancement: blocked / permitted / not approved by checkpoint

For CHECKPOINT, use `M<n>-checkpoint-r<revision>.md`, verdict **DRAFT FEEDBACK**,
and advancement **not approved by checkpoint**. Draft feedback does not approve
a milestone; unresolved blocking findings halt dependent work until resolved.

## Blocking findings

1. `<file:line or missing check>` — problem, consequence, evidence/reproduction, minimal fix, required retest. Write `None` if empty.

## Non-blocking findings

- Finding; owner; due milestone. Write `None` if empty.

## Evidence and rubric

| Category/check | PASS / FAIL / UNVERIFIED / N/A | Command, observation, artifact, or reason |
| --- | --- | --- |
| Scope/spec | | |
| Shader/field | | |
| Interaction | | |
| Mobile/lifecycle | | |
| Performance | | |
| Visual intent | | |
| Maintainability/deployment | | |

Environment: device, OS/browser, viewport, DPR/quality, preview URL/port (or PLAN-only).

## Manual verification

1. <3–6 steps with expected results; gate audit for PLAN.>

## Gaps and next gate

List untested checks, expected future features, and exact advancement condition. Approval applies only to the reviewed head and scope.
