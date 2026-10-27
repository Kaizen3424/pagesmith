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
### P0 verification (2026-10-27)
- Contract as code now: `GitBackend` (branch is a parameter on every method; `baseHeadSha` CAS; exhaustive boolean `capabilities` incl. `commitStatus`), the truncation assert `assertNotTruncated` + `Result` type (INV-N02 setup), and the shared contract-suite runner the fixture exemplar passes. Transport lands P1 (reads) / P2 (writes). No deviation.

### P1 addendum (2026-10-27) — read surface amendment
The P0 interface was a write-shaped skeleton; reads need their own surface. Supersedes the P0 method shape (not the laws):
- `TreeEntry` gains `path` (tree entries are useless without it); tuple equality remains `{sha, mode, type}` and path is the map key in diffs.
- Read methods (branch parameter on EVERY method, INV-P14):
  - `readTree(branch, commitSha, options?: { etag?: string }) → { kind: 'tree', tree, etag } | { kind: 'not-modified', etag? }`
  - `readFile(branch, path, blobSha, options?: { etag?: string }) → { kind: 'file', file, etag } | { kind: 'not-modified', etag? }`; the implementation uses the contents route for small files and `/git/blobs` for >1MB (including the contents-route fallback), never `raw.githubusercontent.com`.
  - `listChangedFiles(branch, baseSha, headSha) → Map<path, TreeEntryTuple>` — branch is now explicit (P0 omitted it; review defect fixed).
- ETag/conditional cache logic lives in the admin queryFns; the backend only sends `If-None-Match` and reports `not-modified`. No second cache in the transport.
- Recursive tree reads assert `!truncated`; on truncation the backend walks subtrees non-recursively and fails loudly if a subtree is still truncated (INV-N02).
- Read errors are a small typed set for P1 (`AUTH_EXPIRED`, `SCOPE`, `NOT_FOUND`, `RATE_LIMIT`, `NETWORK`, `UNKNOWN`); the full classified union + write cases lands P2.2.
