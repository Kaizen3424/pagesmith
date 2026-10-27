# Invariant Master List — testable claims (living checklist)

> Every row = a claim enforced by a named test. Agents tick the checkbox when the test exists AND passes. New invariants get added at the moment they're designed (not retrofitted). Tier: L0/L1/L2 per `01-spec.md §4`. Failure mode rule: an invariant without a test is an open P-task for the current phase, never "known behavior".

Save pipeline & concurrency:

- [ ] INV-P01 · L1 · FF-only: any concurrent-push fixture → 422 handled, HEAD unchanged, no `force:true` in request log — `core/src/pipeline/__tests__/inv-ff-only.test.ts`
- [ ] INV-P02 · L1 · Atomicity: fault injected between blob/tree/commit/ref → HEAD unchanged; retry reconciles to one commit (all-or-none) — `inv-atomicity.test.ts`
- [ ] INV-P03 · L1 · Idempotent retry: repeated blob/tree calls converge to equal SHAs; ref updated exactly once — `inv-idempotent-retry.test.ts`
- [ ] INV-P04 · L1 · One-flight queue: overlapping saves (autosave+manual+media) serialize to exactly one updateRef; second save rebases on first's commit sha — `inv-one-flight.test.ts`
- [ ] INV-P05 · L1 · Same-file predicate: applies iff ∀changed `remoteTuple(baseBlob) == baseTuple` OR `canon-equal`; drifted same-file blocks w/ field-granularity freeze; drifted other-files auto-reapply — `inv-conflict-predicate.test.ts`
- [ ] INV-P06 · L1 · Tuple-equality `{sha,mode,type}`: mode/type-only foreign drift never silently applies (auto-restore w/ commit-body warning / block on type change) — `inv-tuple-predicate.test.ts`
- [ ] INV-P07 · L1 · Canon relaxation both ways: formatting-only foreign commit + pending edit → silent auto-rebase (remote bytes adopted); semantic drift never false-passed — `inv-canon-relax.test.ts`
- [ ] INV-P08 · L1 · Fresh-binding: challenge reads NEVER come from ETag/sha cache; poisoned stale cache still yields block on real drift — `inv-fresh-binding.test.ts`
- [ ] INV-P09 · L1 · Verify-then-rebuild: unknown-outcome retry re-GETs the ref first; done/rebuild/conflict classified; never blind replay — `inv-verify-rebuild.test.ts`
- [ ] INV-P10 · L1 · Published-by-content: `updateRef 200` → published (idempotent re-verify); network-died-after-applied → tree-sha check resolves state; orphan blobs never "cleaned" — `inv-published-truth.test.ts`
- [ ] INV-P11 · L1 · Parked-tx resume: 429+Retry-After mid-chunk → drafts present in IDB **before first network call**, countdown park, resumes w/o loss/duplicate — `inv-parked-tx.test.ts`
- [ ] INV-P12 · L2 · Crash-recovery replay: kill tab mid-commit → boot replays drafts (equal→discard / canon-diff→offer / drift→conflict); draft deleted ONLY post-ref-verify — e2e `kill-tab.spec.ts`
- [ ] INV-P13 · L1 · Lease: BroadcastChannel save-lock w/ TTL + heartbeat + silent steal (storage-event fallback); payloads never carry sensitive data — `inv-save-lease.test.ts`
- [ ] INV-P14 · L1 · Branch param: zero `main` literals in backend/pipeline (lint fixture); branch names URL-encoded incl. `+` — `inv-branch-param.test.ts`

Serialization & parse:

- [ ] INV-S01 · L0 · Untouched-file byte identity: `serialize(parse(raw)) === raw` on all yve fixtures — `core/src/cache/__tests__/golden-byte-identity.test.ts`
- [ ] INV-S02 · L0/L1 · No-op saves emit zero-diff commits (tree-sha equality); CRLF/ETag variants don't false-change — `inv-noop-diff.test.ts` (**P1 scope:** serializer byte identity, CRLF canon, `listChangedFiles(base,base)=∅`; **P2 C.1 scope:** zero-diff commit assertion — owner-approved split 2026-10-27)
- [ ] INV-S03 · L0 · Lenient-read/strict-save: all 6 yve drift fixtures render w/ banner; save refuses unclean; untouched patch preserves unmodeled keys verbatim — `inv-lenient-strict.test.ts`
- [ ] INV-S04 · L0 · Default-immunity: parse never injects hidden defaults (no key creation); defaults only via new-entry/template leaf-fold — `inv-default-immune.test.ts`
- [ ] INV-S05 · L0 · Prototype pollution: `{"__proto__":…}` + nested `constructor.prototype` fixtures; `parseUntrustedJson` only; repo-wide ban on unsafe merges (grep-gated) — `inv-prototype-pollution.test.ts`
- [ ] INV-S06 · L0 · Size/depth caps: entry ≤2MB, depth ≤64, list ≤5k items, render recursion guard — `inv-parse-caps.test.ts`

Content trust & XSS:

- [ ] INV-T01 · L0 · Templates render as text nodes ONLY (mustache-lite); golden XSS suite over summaries, preview_path, alt, group patterns — `core/src/safety/__tests__/inv-golden-xss.test.ts`
- [ ] INV-T02 · L1 · `safePath()` on read AND write: rejects `..`, backslashes, encoded slashes, prefix escapes — `inv-safe-path.test.ts`
- [ ] INV-T03 · L0 · `safeUrl()`: scheme allowlist; rendered `target=_blank rel=noopener noreferrer`; `javascript:`/`data:` URLs rejected — `inv-safe-url.test.ts`
- [ ] INV-T04 · L2 · SVG: uploads rejected; existing SVG render via `<img src=blob:>` only; zero inline `<svg>` of repo files — e2e `svg-trust.spec.ts`
- [ ] INV-T05 · L0 · EXIF strip by construction (re-encode) + orientation preserved; upload pre-caps (≤15MB, natural dims pre-check, ~400KB target) — `inv-upload-caps.test.ts`

Token & auth lifecycle:

- [ ] INV-A01 · L2 · 401 mid-batch: queue discarded, token wiped, drafts retained, inline re-auth sheet, probe re-run before resume — e2e `token-death.spec.ts`
- [ ] INV-A02 · L1 · Classifier matrix: 404/403/401/422 (+body strings) → named guided screens; founder surfaces never show GitHub prose — `inv-error-taxonomy.test.ts`
- [ ] INV-A03 · L1 · Capability probe: login‑time probe (rate_limit/repo/protection-admin/checks) + re-probe on 401/403/422-after-write; probe never cached persistently; no requests inside quota-blocked windows — `inv-probe.test.ts`
- [ ] INV-A04 · L0 · Token never in URL/query; only accessible via AuthProvider; wipe on sign-out/failed-bootstrap/401 — `inv-token-hygiene.test.ts`
- [ ] INV-A05 · L0 · Log masking: authorization/token/secret/x-github-* keys + `github_pat_…`/`ghp_…`/email value-regex masked; ring buffer memory-only — `inv-log-masking.test.ts`

Network & rate:

- [ ] INV-N01 · L1 · Throttling/concurrency ≤5; `Retry-After`/`X-RateLimit-Reset` honored; primary exhaustion = reset countdown UI, event-driven resume — `inv-rate-policy.test.ts`
- [ ] INV-N02 · L1 · Tree reads assert `!truncated`; truncated → subtree-walk fallback; contents-dir 1000-cap unused for correctness — `inv-truncation.test.ts`
- [ ] INV-N03 · L2 · Preview path: zero `raw.githubusercontent.com` traffic (blob-API, sha-keyed, overwrite invalidates instantly) — e2e origin allowlist assertion
- [ ] INV-N04 · L2 · Prod purity: no `.map`, no `sourceMappingURL`, no `mockServiceWorker` bytes, no telemetry strings — CI byte-scan
- [ ] INV-N05 · L2 · Origins: catch-all route aborts anything outside `self`/`api.github.com`/`blob:`/`data:` — e2e `origin-allowlist.spec.ts`

Deploy status honesty:

- [ ] INV-D01 · L1 · Check-runs primary (statuses fallback via `contexts[]`); sha-matched all-success only → "Live"; absent within grace (120s) → "unavailable", NEVER "failed" — `inv-status-truth.test.ts`
- [ ] INV-D02 · L0 · Generated/editable commit messages reject `[skip ci]`-class tokens — `inv-skip-token.test.ts`
- [ ] INV-D03 · L1 · Supersede: head advanced → "superseded by {sha}" annotation; per-entry chip keyed to `latestCommitSha` (newest-save-wins copy) — `inv-supersede.test.ts`

Media economy:

- [ ] INV-M01 · L1 · Media path bijection `/images/** ⇄ public/images/**`; per-collection folder overrides honored — `inv-media-bijection.test.ts`
- [ ] INV-M02 · L1 · Batch integrity: N photos + entry JSON = ONE tree commit; per-tile retry re-sends only failed file — e2e `slow-wifi.spec.ts`
- [ ] INV-M03 · L1 · Deletion guarded by `findReferences()` across collections + single-file docs; delete blocked with deep-linked users — `inv-referential-delete.test.ts`

Cutover & parity (L3, scripted checklists in phase files):

- [ ] INV-C01 · Parity golden: frozen field-by-field diff config-package vs `yve-inventory.md`; drift changes break BOTH sides
- [ ] INV-C02 · Schema-swap: yve `content.ts` imports CMS schemas; the 6 drift cases pinned by CI fixture
- [ ] INV-C03 · Normalize-once: pipeline-pass normalization commit; `serialize(parse(raw))=== raw` post-pass for all 16 files
- [ ] INV-C04 · Rollback: `/admin-legacy` intact; one-PR revert path rehearsed on fork; `restrict-force-pushes` verified ON
