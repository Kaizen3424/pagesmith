# Phase P2 — Save pipeline + editor v0

> Status: ⬜ · Prev gate: P1 ✅ · NEW chat required — **highest-risk phase; checkpoints inside**

## Pre-flight checklist
- [ ] P1 gate ✅; `01-spec.md` §5 state law read; ADRs to load now: **0004 (rebase + state machine + lease) — THE phase ADR**, **0005 (transactional backend)**, **0008 (status truth)**, plus 0002 (token lifecycle edges)
- [ ] `invariants.md` INV-P*/A01/A02/N01/D01–03 fully internalized
- [ ] Checkpoint plan: implement in C.1 → C.2 → C.3 slices, each with its own mini-gate (below) — never bulk-build this phase in one session block

## Goal
The full **publish loop**: edit → validate → squash-commit → FF ref update → per-entry build status, with typed failure taxonomy and the conflict machinery — the riskiest code in the project, built behind property tests.

## Deliverables
- Core: `commitChanges` transactional pipeline (blobs→tree(base_tree)→commit→updateRef FF) w/ fresh `getRef` before every commit · verify-then-rebuild retry · invariant engine (tuple+canon predicate, fresh-binding) · `rebase()` pure fn + 11 property tests · GitError union + classifier · save state machine + one-flight queue + self-rebase + BroadcastChannel lease (TTL+steal+storage-fallback) · drafts (IDB, pre-network-write assert, post-ref-verify delete) · boot recovery replay
- Admin: entry editor v0 (basic widgets via registry: string/text/number/boolean/select/datetime) + save bar w/ milestone law · deploy-status service (check-runs polling, grace, supersede, contexts fallback) · cross-entry sweep verdict classes + advisory chips + coverage-honest copy · conflict field-granularity freeze UI · failure screens + Copy-message composer w/ `support.name` interpolation
- Tests: INV-P01–P14 green; INV-A01/A02; INV-N01; INV-D01–03; contract suite extended (full commit side vs FakeGithub chaos modes); GithubBackend recorded-fixture capture script (sandbox repo) + first replay fixtures

## Checkpoint slices (mini-gates)
- [ ] **C.1 backend commit** — transactional call path + INV-P01/02/03/09/14 green vs FakeGithub chaos hooks
- [ ] **C.2 invariant engine + rebase()** — INV-P05/06/07/08 + rebase property tests green; conflict decision matrix documented in ADR-0004 appendix
- [ ] **C.3 state machine + UI loop** — INV-P04/10/11/12/13 + editor save bar + status service green; e2e full publish loop (incl. conflict + throttle-park) green

## Gotchas (panel)
- Never trust cached reads in conflict decisions (fresh-binding!) — cache poisoning test is mandatory.
- Do not conflate "Saved ✓" with status verdicts; w/o Checks read the status pre-degrades (copy exists).
- Lease steal must FULLY rebaseline; no blind re-dispatch on resume (paused reasons table).
- Commit messages: `chore(cms): …` prefix, skip-token stripping, user-editable w/ code-free default.

## Exit gate (owner-confirmed)
- [ ] All INV-P/ A01/A02/N01/D01-03 green in CI; e2e publish loop + conflict + parked-tx + token-death journeys green
- [ ] Recorded fixtures captured from sandbox repo + replay test committed; contract suite README short "how to run"
- [ ] Docs: ADR-0004/0005 "verified" notes updated; AGENTS.md status/logs updated

## Session log
- (none yet)
