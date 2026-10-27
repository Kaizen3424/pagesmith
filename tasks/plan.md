# Implementation Plan — MyCMS (master; per-phase task detail)

> Template per `planning-and-task-breakdown`. Phase briefs (`docs/specs/phases/`) are the working docs agents load per session; THIS file holds the task blocks. Status lives in `AGENTS.md §2` and checkboxes in `tasks/todo.md` only.

## Overview
A git-backed zero-database CMS (headless core + brandable React admin) built in 8 checkpoint-gated phases P0→P7 — spec list in `01-spec.md`, invariants in `invariants.md`, decisions in `docs/adr/`.

## Architecture decisions (summary — full: docs/adr/)
- Transactional backend (`commitChanges` + FF-CAS + capabilities) · ADR-0005
- Zod-first closed config + lenient-read/strict-save + untouched patch · ADR-0003
- rebase() value-domain-dirty/raw-domain-merge + save state machine + lease · ADR-0004
- Two registries (core field types / admin widgets) + services boundary · ADR-0009
- Compose-root DI + shared backend contract suite + exemplars · ADR-0001/0009
- Sanitize policy + media staging/worker pipeline · ADR-0006/0007
- Token persisted-opt-in w/ lifecycle conditions · ADR-0002
- Deploy-status via check-runs + honest unknown/supersede · ADR-0008

---

## Phase 0 — Foundation (see `P0-scaffold.md`)

### Task P0.1 — Repo bootstrap (S)
- Acceptance: git repo initialized; trunk-based rules recorded; empty commit hygiene.
- Verify: `git log --oneline` clean conventional history; `git status` clean.
### Task P0.2 — pnpm workspace + catalog (M)
- Acceptance: workspaces resolve; catalog versions pinned; frozen-lockfile install green.
- Verify: `pnpm install --frozen-lockfile` green from scratch; `pnpm -r typecheck` green.
### Task P0.3 — Build/security allowlist (S)
- Acceptance: `onlyBuiltDependencies` committed w/ reasons; audit-waivers schema file exists.
- Verify: fresh install issues zero prompts; `pnpm audit --json | waiver-filter` script runs green.
### Task P0.4 — Core skeleton (M)
- Acceptance: module barrels compile; echo test green; tsup build green.
- Verify: `pnpm --filter core build` + `test` green.
### Task P0.5 — Admin shell (M)
- Acceptance: vite + React19 + Tailwind v4 tokens + TanStack Router/Query + RHF scaffolded; login route renders tokens only.
- Verify: dev server + `pnpm -r build` green; route smoke screenshot.
### Task P0.6 — Playground + FakeGithub skeleton (M)
- Acceptance: MSW handler module + fixture loader + contract-suite runner stub (returns TODO suite) + env-kill guard.
- Verify: unit test refuses real-GitHub without env flag (INV-A05-adjacent).
### Task P0.7 — E2E skeleton (S)
- Acceptance: chromium-only project + smoke + catch-all origin assert wired.
- Verify: `pnpm e2e` green.
### Task P0.8 — CI pipeline (M)
- Acceptance: full gate matrix committed (see P0 file) + scheduled audit job.
- Verify: first push green on CI (owner schedule the push when finishing).
### Task P0.9 — Changesets (S)
- Acceptance: `pnpm changeset` operates; private packages are VERSIONED by changesets but never published/tagged (publish-skip only — ADR-0010; wording fixed 2026-10-27, supersedes "private-version-skip")
- Verify: doc change w/ changeset file passes CI.
### Task P0.10 — LICENSE final (XS) — ask owner for name once.
### Task P0.11 — ADR verification pass (S) — notes on 0001–0010 implementability; deviations → spec updates first.
### Task P0.12 — Commands finalization (S) — AGENTS.md §6 + spec §3 get the real wording.

**Checkpoint: Foundation** — clean-clone install → typecheck → lint → test → build → e2e green end-to-end; owner review.

## Phase 1 — Config + read path (see `P1-config-read.md`)
```
P1.1  DSL factories + closed config schema        (M, seq)
P1.2  Field registry + lenient parse + defaults   (M, after 1)
P1.3  Canonical serializer + goldens fixture-run  (M, after 2)
P1.4  GitBackend read ops + listChangedFiles      (M, seq w/ 1)
P1.5  Snapshot store + ETag cache                 (M, after 4)
P1.6  parseUntrustedJson + caps                   (S, seq w/ 2)
P1.7  Contract suite read-side                    (M, after 4–5)
P1.8  Auth provider + PAT + capability probe      (M, after 5)
P1.9  Admin shell + tokens + login screen         (M, after 8)
P1.10 Library screen driven by config             (M, after 2, 5, 9)
P1.11 ServicesProvider + entryIndex               (M, after 5, 10)
P1.12 yve fixture mirror + drift fixtures         (M, after 3)
P1.13 Collator + money + slug-read                (S, after 2)
P1.14 FakeGithub read handlers + chaos modes      (M, after 4)
```
**Checkpoint: P1** — e2e browse journey + INV-S01–S06 + P14 + read-side suite green.

## Phase 2 — Save pipeline (see `P2-save-pipeline.md`)
```
C.1  P2.1 commitChanges full path (M) → P2.2 error taxonomy + classifier (M) → P2.3 retries + throttling (M)
C.2  P2.4 invariant engine + rebase() + property tests (L → split if >2 session)
C.3  P2.5 state machine + lease + drafts + boot replay (L) → P2.6 editor v0 + save bar (M)
     → P2.7 sweep verdict logic + advisory chips (M) → P2.8 deploy-status service (M)
     → P2.9 conflict freeze UI field-granular (M, UX core lands here) → P2.10 failure screens + copy composer (M)
     → P2.11 recorded-fixture capture script + replay (S) → P2.12 e2e journeys (M)
```
**Checkpoint: P2 (3 mini-gates)** — every INV-P + A01/A02/N01 + D01–03 green; owner demo of publish loop.

## Phase 3 — Widgets (see `P3-widgets.md`)

Tasks P3.1–P3.9 in the phase file; sizes S/M; parity golden (INV-C01 initial) is the phase goal.

**Checkpoint: P3** — "yve exact config editable, zero code change" demonstrated.

## Phase 4 — Media (see `P4-media.md`) — Tasks P4.1–P4.9; INV-M/T04/T05/N03.
**Checkpoint: P4** — 9-photo slow-wifi journey green; tombstone restore green.

## Phase 5 — Polish + IA (see `P5-polish-ia.md`) — Tasks P5.1–P5.10; founder-cry triad scripts; copy scanner; a11y suites.
**Checkpoint: P5** — owner demo of consent→edit→conflict→failure→recover loop.

## Phase 6 — Cutover (see `P6-cutover.md`) — ordered stop-and-confirm stages 1–7; yve writes are Ask-first.
**Checkpoint: P6 = Stage A done.**

## Phase 7 — OSS (see `P7-oss.md`) — Tasks P7.1–P7.7.
**Checkpoint: P7 = published; Stage B continues via Appendix B backlog.**

## Risks & mitigations (top, from panel — full register master-plan §13)
| Risk | Mitigation |
|---|---|
| CAS/concurrency bugs corrupt content | property tests + chaos e2e + recorded fixtures; never force:true |
| Silent build failures destroy trust | milestone law, copy-message composer, check-runs truth |
| XSS via unfriendly renders | sanitize ADR set + golden suite + CI lint gates |
| Supply chain compromise | allowlist/frozen/audit/waiver-expiry + origin assertions |
| Founder-FRICE (PAT expiry/conflict/delete dread) | UX law + tombstones + expiry kit — all phase-5 gated |
| yve integration breakage | fork rehearsal first; schema swap behind fixture; /admin-legacy rollback |

## Open questions
- None blocking P0; see `01-spec.md §8`.
