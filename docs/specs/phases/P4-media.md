# Phase P4 — Media system

> Status: ⬜ · Prev gate: P3 ✅ · NEW chat required

## Pre-flight checklist
- [ ] P3 gate ✅; ADRs: **0007 (media pipeline) — the phase ADR**, 0005 (commit-with-entry), 0006 (SVG/safePath); master-plan §5 media items; `invariants.md` INV-M*/T04/T05/N03
- [ ] `tasks/todo.md` § P4 loaded

## Goal
Media: browse/upload/edit/delete with founder-grade safety (staged tiles, batched single-commit saves, reference-guarded deletion, sha-keyed fresh previews) — and the e2e proof that a slow 9-photo session survives everything.

## Deliverables
- Core: media service above backend (path mapping bijection + safePath on read/write) · staged tile records in drafts → single-tree commit with entry save (ADR-0007 §1) · client SHA-1 precompute dedupe · `/git/blobs` preview cache (sha-keyed, object-URL revocation) · media budget guard (warn ~800MB / block >90MiB client) · `findReferences()` engine (cross-collection + single-file docs; used-in deep links)
- Admin: media library screen (grid, per-collection folder filter, alt prefill "Last used as: …", copy-path, replace-in-place warning w/ 1h CDN honesty) · upload tile UX (ring progress, filename auto-sanitize shown, per-tile retry re-sends only failed file, network banner) · delete rungs: remove from entry / remove from library (used-in block w/ deep list) / tombstone `_trash/{collection}/` + recently-deleted (restore w/ honest subtitle note BEFORE the button)
- Tests: INV-M01/M02/M03, INV-T04/T05, INV-N03 e2e; slow-wifi (9-photo, one fails at 80%) journey; tombstone restore journey; dedupe unit tests

## Tasks (plan.md P4.1–P4.9)
- [ ] 1. Media service: path bijection + folder overrides + budget math from snapshot tree
- [ ] 2. findReferences engine (+ fixture tests incl. `home.studyProduct` + `featuredProducts` + image paths)
- [ ] 3. Upload worker pipeline (OffscreenCanvas re-encode, EXIF strip test, caps, filename sanitizer)
- [ ] 4. Tile staging in draft records + commit-with-entry integration into P2 pipeline (INV-M02 fault-injection)
- [ ] 5. Blob-API preview cache sha-keyed + `URL.revokeObjectURL` lifecycle (memory-leak test)
- [ ] 6. Media library screen + library→editor flows (prefill alt "Last used as", copy path)
- [ ] 7. Delete rungs + tombstone `_trash/` writes outside content globs + restore (+ recently-deleted nav slot)
- [ ] 8. Content trust e2e: zero raw.githubusercontent (INV-N03); SVG upload rejection; existing SVG via `<img>`
- [ ] 9. slow-wifi e2e journey (INV-M02) + replace-in-place warning copy verification

## Gotchas
- Tombstone folder MUST be outside every configured content glob (build-invisible) — guard test: zod build fixture verifies files under `_trash/` are ignored
- Upload bursts must respect throttle (≤5 concurrent blobs); parked-tx resume test already covers 429-mid-chunk — re-run with media (INV-P11 re-assert).
- Blob previews for PRIVATE repos work via authed API only; no public-repo-only code path (decision matrix note in ADR-0007).

## Exit gate
- [ ] INV-M01/M02/M03 + INV-T04/T05 + INV-N03 green in CI + e2e
- [ ] 9-photo journey green; tombstone restore journey green; budget warnings demo'd
- [ ] AGENTS/todos/logs updated; owner-confirmed

## Session log
- (none yet)
