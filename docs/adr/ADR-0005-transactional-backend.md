# ADR-0005 — Backend = transactional Git-Data commits with FF-CAS; capabilities object

**Status:** Accepted · 2026-10-27

## Context
Round-1 blocker 1: a file-op-shaped backend (contents-API PUTs) produces N commits + partial-failure races and cannot honor "one squash commit". Round-1/2 GitHub review established: `PATCH /git/refs` has NO expected-SHA parameter; the guard is the server-enforced fast-forward (`force:false`, 422 = moved); compare-API is truncating/patch-trimming; trees can truncate at 100k entries/7MB.

## Decision
- Write path (THE primitive): `commitChanges({adds, updates, deletes}, baseHeadSha)` → client SHA-1 precompute → `createBlob` (≤5 concurrent) → `createTree` **with `base_tree`** (only changed paths; NEVER client-assembled full trees) → `createCommit(parents=[verified head])` → `updateRef force:false`. `writesFile` = sugar for single-file docs. Retry = **verify-then-rebuild** (GET ref first — done/rebuild/conflict), never blind replay, never `force:true`.
- Reads: single recursive root tree GET cached by commit-sha + ETag (304s quota-free), per-collection client-side filtering, `truncated:true` → assert/preview + subtree-walk fallback; `listChangedFiles(baseSha, headSha)` = tree set-diff keyed `{path → {sha, mode, type}}`; >1MB content via `/git/blobs`; contents-dir 1000-cap unused for correctness decisions.
- Conflict predicate (fixes whole-file-block/overwrite): apply iff ∀ changed path `remoteTuple == baseTuple` OR `canon(remoteBytes)==canon(baseBytes)` (auto-rebase w/ warning; mode-only diff auto-restores w/ commit-body warning entry; type change blocks); challenge reads are **fresh** (never cached) — INV-P08.
- Branch = parameter on EVERY method (`getRef(branch)`, `commitChanges(..., branch)`); zero `main` literals (lint fixture INV-P14). Stage-B PR/staging mode plugs in without interface break.
- `capabilities` = required exhaustive literal object (`{commitStatus: boolean, branches: boolean, …}`) — adding a key breaks every implementation at compile time; optional method-shaped capabilities (e.g. `commitStatuses?(sha) → {state:'pending'|'success'|'failure'|'unsupported', url}`) accessed ONLY after capability check. Media service lives ABOVE the backend; folder policy is config not transport.

## Consequences
- Rate math documented (write burst ≈ 17 req/saves well under 900 pts/min & 5000/h; secondary limits handled by plugin-throttling + Retry-After policy).
- GithubBackend additionally covered by recorded HTTP fixtures from a sandbox repo (transport-drift hedge).
- `main`-hardcoding anywhere is a review-blocking defect.
