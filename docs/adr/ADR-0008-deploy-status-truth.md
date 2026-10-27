# ADR-0008 — Deploy-status truth: check-runs primary, graceful unknown, per-commit honesty

**Status:** Accepted · 2026-10-27

## Context
Cloudflare Workers Builds reports **GitHub check runs** (one per connected Worker; watch-path-filtered projects emit none) — NOT commit statuses; the combined statuses endpoint stays EMPTY (round-1 blocker 3: plan would read "unknown" forever). Build-skipping tokens `[skip ci]` et al. and later pushes complicate "is the site live?" truth. Round-2 UX made "Saved ✓" a terminal milestone independent of status visibility (degrades if the PAT lacks Checks read).

## Decision
1. **Poll check-runs**: `GET /repos/{owner}/{repo}/commits/{sha}/check-runs?per_page=1` on OUR exact commit sha — queued/in_progress/pending/blocked → "building"; all conclusions success → "Live"; any failure → "didn't go through" + detail URL (never raw dashboards).
2. **Fallback**: config `contexts[]` enables commit-status polling for third-party CI.
3. **Grace honesty**: no check run within 120s (5s → 10s cadence, jittered) → "Build status unavailable", NEVER "failed", with cause-hint list + `commits/{sha}` deep link.
4. **Skip-token hygiene**: generated + user-editable commit messages REJECT `[skip ci]|[ci skip]|[no ci]|[skip actions]` (the CMS must never silently suppress its own deploy).
5. **Per-commit truth under overlap**: chips keyed to per-entry `latestCommitSha`; a check run landing on C1 after C2 exists must not display stale "Live" for newer state — chip shows "Live now: €1.490 · your newest save (€1.495) is still building"; head advanced ⇒ "superseded by {sha}" annotation; top-bar banner "live site reflects current head".
6. **Pat-gen**: PAT recipes include Checks read (InvD-INV-D01 prerequisite); missing permission at probe ⇒ feature disabled gracefully ("Auto-deploy status is disabled") — never a spinner loop.
7. Milestone law (from UX): "Saved ✓ (site updating ~2 min)" persists regardless of statuses; >6 min → event-copy exit; failure screen = "your words are saved, the public site is unchanged, 9-in-10 not your text" + Copy-message for [partner] — banned words: build/commit/deploy/token (INV-founder-copies).

## Consequences
Late-arriving failures may surface under a newer chip — resolved by per-commit keys + reveal-on-journal, accepted (TR3): "Live" = per-commit truth; the banner supplies whole-site truth.
