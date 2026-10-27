# Phase P1 — Config schema + read path

> Status: ⬜ · Prev gate: P0 ✅ · NEW chat required

## Pre-flight checklist
- [ ] P0 gate confirmed ✅ in chats/AGENTS.md status board
- [ ] `01-spec.md` read; ADRs to load now: **0003 (zod-first DSL)**, **0005 (read ops)**, **0006 (parse trust)**, **0009 (registry + ServicesProvider)**; peek ADR-0004 for snapshot-store semantics
- [ ] `docs/reference/yve-inventory.md` FULL read (you are implementing its exact shapes via the DSL)
- [ ] `tasks/todo.md` § P1 + `tasks/plan.md` § P1 loaded; `invariants.md` INV-S*/P14 sections open

## Goal
The admin can **log in with a PAT and browse a real-shaped repo offline** (fixtures), with lenient parsing, closed config schema, and the full read-side of the backend — no writing yet.

## Deliverables
- Core: `defineCollection/defineField` + `fields.*` factory set (string, text, number, boolean, select, datetime, list, object, image, relation, hidden, divider, slug-virtual) w/ declaration-merging registry types · `GitBackend` interface + GithubBackend **read ops only** · snapshot store (monotonic) + ETag/conditional cache · `parseUntrustedJson` + caps · lenient parse contract (`{value, issues, untouched}`) + strict-save validator surface · collator module + money helper · safety utils (safePath/safeUrl/mustache-lite)
- Admin: login screen (PAT card + capability probe skeleton) · app shell w/ tokens (dark-luxury default) · library screen (groups/search/sort/summary thumbnails) reading fixture mirror · ServicesProvider (entryIndex sync-from-cache + async fallback) + reference-fixture-backend passing shared read-side contract tests
- Playground: 16-file yve fixture mirror + drift-case fixtures; FakeGithub hits read-side contract suite
- Tests: INV-S01..S06 stubs become real (goldens vs fixture mirror bytes); INV-P14 lint fixture; ADR-0009 backend exemplar acceptance (read side)

## Tasks (details plan.md P1.1–P1.14)
- [ ] 1. Zod-first DSL: fields factories return schema+meta wrappers; closed `z.strictObject` collection config; schemaVersion field
- [ ] 2. Field-type registry + declaration-merging `{Value, Raw, Config}` type plumbing; lenient parse `{value, issues, untouched}` + default-immunity unit tests (INV-S04)
- [ ] 3. serialize canonical JSON module (2-space, author key order, LF, trailing \n; only edited files re-serialize) + golden byte-identity vs fixture mirror (INV-S01/S02)
- [ ] 4. GitBackend interface + GithubBackend read ops: `getRef`, `readTree` recursive w/ ETag + truncation assert/fallback (INV-N02), `readFile` (blob route >1MB), `listChangedFiles` tree-diff — branch param EVERYWHERE (INV-P14)
- [ ] 5. Snapshot store + monotonic advance rule + ETag cache-in-queryFn (INV-P08 foundation)
- [ ] 6. `parseUntrustedJson` + prototype fixtures + size/depth caps (INV-S05/S06)
- [ ] 7. Contract suite: read-side spec set runnable vs FakeGithub AND reference-fixture-backend (ADR-0009 acceptance)
- [ ] 8. Auth: AuthProvider interface + PatProvider + token lifecycle (storage adapter seam per ADR-0002) + capability probe (rate_limit/repo/protection-admin/checks) — probe tests (INV-A03 partial)
- [ ] 9. Admin shell + design tokens + login screen (PAT card copy from UX law; human error screens from taxonomy codes)
- [ ] 10. Library screen driven by config (groups, sort via shared collator, summaries mustache-lite, thumbnails, preview links via safeUrl)
- [ ] 11. ServicesProvider + entryIndex; relation display data path (render "Iris No. 7")
- [ ] 12. yve fixture mirror + 6 drift fixtures loaded; library renders ALL entries incl. drift cases w/ banner (INV-S03)
- [ ] 13. Slugs/colors: slug virtual field prototype (read side only), shared comparator, money helper + unit tests vs nl-NL
- [ ] 14. MSW FakeGithub: read-side handlers + fixtures + truncation/404 chaos modes used in INV-N02 tests

## Gotchas
- Do NOT bind widgets to React yet beyond shell; P1 UI = display + login only.
- ETag caching must live INSIDE queryFns (single-cache law ADR-0004/0001) — no second cache.
- Fixture file bytes = yve's EXACT formatting (2-space, key order, LF, trailing newline) — they are the golden corpus; generate from inventory mirror, not by hand retyping (script + verify sha against held values).

## Exit gate
- [ ] e2e: login → browse all yve-fixture entries offline → open 3 entries incl. one drift file renders w/ banner — green
- [ ] `INV-S01..S06`, `INV-P14`, `INV-A03(partial)`, INV-T01/02/03 core tests green; read-side contract suite green vs BOTH backends
- [ ] `AGENTS.md`/todos/logs/gate items updated (agent review w/ owner)

## Session log
- (none yet)
