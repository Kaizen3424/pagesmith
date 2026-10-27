# ADR-0004 — rebase() semantics + save state machine + save lease

**Status:** Accepted · 2026-10-27

## Context
Concurrency policy is "guided re-conflict" (no 3-way merge in v1), yet round-2 found the naive version: (a) whole-entry Take/Show buttons vaporize founder work; (b) queued second entry false-conflicts against its own first commit's head; (c) boolean soup (`dirty/saving/error`) multiplies unsoundly; (d) a dead committing tab can deadlock cross-tab locks.

## Decision — rebase() formal contract (property-tested, 11 cases)
```
rebase({formValue, dirtyPaths: Set<fieldPath>, oldBase, newBaseRaw, oldRaw})
  → { mergedRaw, conflicts: fieldPath[] }
```
- **Dirty decided in the VALUE domain** (per-field `fieldEquals`: exact codepoints, list order significant, recursion: objects recuse, lists per item).
- **Merge performed in the RAW domain**: dirty paths serialize from the form; everything else copied verbatim from `newBaseRaw` (unknowns come only from the new raw — old unknowns never resurrect; deletion warns).
- No-op iff `mergedRaw === newBaseRaw` byte-equal.
- Property tests P1–P11: disjoint-preserve · overlap-conflict (never silent win) · idempotence · no-change identity (no re-serialization) · unknown-preserve · unknown-loss-warn · key-order preservation · list-permutation-dirty · defaults-never-inject · no-op skip · codepoint-exact equality.

## Decision — save state machine (one transition table, no scattered booleans)
`editing(baseSha) → dirty → queued → committing → published | conflict | failed(retryable→backoff cap→paused(manual)) | paused(reason{network,auth,quota})`
Rules (adopted from round-2): fresh `getRef()` immediately before EVERY commit (queued saves don't false-conflict after own commit) · confirmation by content (200 ⇒ published; lost-response ⇒ tree-sha re-verify; orphan blobs harmless-documented) · drafts deleted only post-ref-verify · resume is never a blind re-dispatch (one batch rebaseline: `getRef`+`listChangedFiles` → queued|conflict) · boot replay through the invariant engine (equal→discard / canon-diff→offer resume / drift→conflict) · progression callback-driven, visibilitychange wakes verify-then-rebuild.

## Decision — cross-tab lease
BroadcastChannel alone is not a lease: implement **token + heartbeat + TTL with silent steal + full rebaseline**; `storage`-event fallback (Safari <15.4); payloads never carry sensitive content; the lease is UX serialization only — the FF/CAS invariant remains the sole correctness mechanism.

## Consequences
GUI conflicts become FIELD-granular: non-overlapping fields auto-merge with announcements; overlapping fields → per-field choices; any discarded version archived 30 days (founder-cry prevention).
### P0 verification (2026-10-27)
- The exhaustive eight-phase save vocabulary is code (`SAVE_PHASE_ORDER`, echo-tested) as the anchor for the single transition table; the machine + invariant engine + `rebase()` land P2.4/P2.5. No deviation.
