# Phase P6 — yve integration cutover (Stage A finale)

> Status: ⬜ · Prev gate: P5 ✅ · NEW chat required · **Touches the yve repo — "Ask-first" boundary is maximum here**

## Pre-flight checklist
- [ ] P5 gate ✅ + owner present for ALL yve steps (this phase IS the acceptance)
- [ ] Read: master-plan §10 (cutover plan), `yve-inventory.md` (parity target), INV-C01–C04; ADR-0005/0007/0008 for site-side assumptions
- [ ] Outstanding owner approvals collected IN CHAT before any write to yve: §1 fork-rehearsal, §3 schema-swap, §4 cutover PR

## Goal
Replace Sveltia at yve `/admin` with this admin's build — rehearsal-first, revert-first, never risking founder trust or main-branch safety.

## Ordered execution (STOP after each stage; owner confirms)
- [ ] **1. Fork rehearsal**: fork repo → point admin config at fork (config-only) → full loop: edit product/image/page → publish → inspect commit shapes → **revert drill** (git revert via UI) once → adjust for surprises
- [ ] **2. Site rails**: `restrict-force-pushes` ON main (verified via settings screenshot/log); confirm no classic branch protection conflict (probe already reads protection); repo media budget check
- [ ] **3. Normalization commit**: one pipeline-run pass through the SAME save pipeline + serializer over all 16 content files (idempotent, golden-verified INV-C03) — verify zero-diff on re-run
- [ ] **4. Schema contract swap** (yve `src/lib/content.ts`): import schemas/types/comparator/money-helper from CMS config package; keep only loading + cross-entry checks; CI fixture pins the 6 drift cases (INV-C02); yve build green
- [ ] **5. Cutover PR**: admin dist → `public/admin/` (assets + `_headers` + noindex meta), Sveltia moved intact to `/admin-legacy/`, robots.txt `Disallow` both, no nav links; prod-purity + origin-allowlist asserts run against deployed URL (INV-N04/N05)
- [ ] **6. Acceptance (INV-C04)**: founder journey checklist (success criteria §1.2 = product edit/create-via-template/collection/page/settings → per-entry "Live ✓"); "Copy message for [partner]" verified end-to-end on a staged build-fail (temporary bad fixture on fork — NOT on main); rollback path rehearsed one final time (revert PR / re-swap)
- [ ] **7. Observation window**: 2 weeks — journal notes in this file's log; any breakout bug = hotfix runbook referencing phase files

## Gotchas
- The yve worker serves `/admin` as static assets — `_headers` file placement must be verified for Workers Builds (site-repo specific; smoke test proves it).
- Do NOT delete Sveltia's files; legacy rename = move untouched (atomic rollback relies on it).
- Founder's device handover happens AFTER cutover acceptance, using the ADR-0002 handover card (persisted opt-in pre-ticked, expiry date recorded).
- `chore(cms):` prefix must be present on every CMS-authored commit; spot-check manual git log visually.

## Exit gate (= Stage A success, owner-verified)
- [ ] Success criteria 1–5 (master-plan §1) all demonstrated on the real site
- [ ] INV-C01–C04 all green/ticked incl. live smoke of headers + noindex
- [ ] Founder completed ≥1 real edit per content type unaided; /admin-legacy rollback proven
- [ ] AGENTS.md: P6 ✅ (date); focus → P7; log complete

## Session log
- (none yet)
