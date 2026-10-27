# TODO — live checklist (tick ONLY with verified evidence)

> Work top-down within the phase marked **Current focus** in `AGENTS.md §2`. One phase per chat. Gate lines (`⛔ GATE`) require owner confirmation in chat; do not proceed past them until ticked by both.

## P0 — Scaffold & laws (status: 🟨 in progress — awaiting ⛔ GATE demo + owner confirmation)
- [x] P0.1 git init + conventions — trunk-based law in CONTRIBUTING.md; LF law via .gitattributes; git meta committed (chore(repo) 5718a34)
- [x] P0.2 pnpm workspace + catalog (frozen install green) — pnpm 10.34.9 pinned via packageManager, exact catalog pins, engines ≥22.12 + engine-strict; frozen install green (chore(supply-chain) 0bbebf3)
- [x] P0.3 build/security allowlist + audit-waivers schema — onlyBuiltDependencies committed = esbuild/lightningcss/@tailwindcss/oxide each with reason (install runs with zero blocked-script warnings; playwright/shiki deliberately absent); security/audit-waivers.yml schema + `pnpm run audit:waivers` green (0bbebf3)
- [x] P0.4 core skeleton (barrels, echo test, tsup build) — 9 module barrels + echo test; 16 vitest tests green; coverage gate on: 96.9% lines (≥90 gate holds); tsup ESM build green (feat(core) 7912657)
- [x] P0.5 admin shell (tokens, router/query/RHF wired, login route) — Tailwind v4 @theme tokens + TanStack Router/Query + RHF + Radix Slot/Label; typecheck + vite build + preview-serves-shell smoke green (feat(admin) 90eb9e2)
- [x] P0.6 playground + FakeGithub skeleton + env-kill guard test — MSW handler skeleton + fixture loader (yve-layout dirs) + MYCMS_ALLOW_REAL_GITHUB guard; 7 tests green (feat(playground) 77b1a2f)
- [x] P0.7 e2e skeleton (chromium-only, smoke, origin allowlist) — chromium installed explicitly (never a postinstall); smoke + INV-N05 catch-all origin-allowlist assertion green (test(e2e) f3df318)
- [x] P0.8 CI pipeline committed (+ push when done) — ci.yml: frozen install → typecheck → biome → vitest (coverage gate) → build → prod-purity scan → e2e; SHA-pinned actions, job-level contents: read, zero pull_request_target (self-enforced by scripts/ci-workflow-guard.mjs); scheduled waiver-filtered audit job (ci: 6b8024c). NOTE: CI run itself validates on first push — owner schedules it
- [x] P0.9 changesets wired — `pnpm changeset status` runs green; privatePackages version-only (never published/tagged — publish is the deliberate P7 flag-flip; plan.md wording fixed under ADR-0010) (build(release) bf9f50e)
- [ ] P0.10 LICENSE owner line (ASK OWNER) — DEFERRED by owner decision 2026-10-27 ("decide later"); placeholder stays; this keeps ⛔ GATE open
- [x] P0.11 ADR 0001–0010 verification pass — "P0 verification" sections appended to all ten ADRs, no deviations; ADR-0010 carries the dated Node-pin addendum (+ tsup dts:false note for TS 7; actionlint/zizmor deferred to OSS with internal guard covering the enforceable subset)
- [x] P0.12 AGENTS.md §6 + spec commands finalized — §6 table and 01-spec §3 materialized with exact flags; README status banner + runnable quickstart updated
- [ ] ⛔ GATE P0: clean-clone install/typecheck/lint/test/build/e2e all green; demo walk-through; owner confirms — clean-clone chain VERIFIED GREEN 2026-10-27 (install --frozen-lockfile, pnpm -r typecheck, check, -r test, -r build, scan:prod-purity, e2e all passed in a fresh clone at bf9f50e); demo + owner confirmation pending

## P1 — Config schema + read path (status: ⬜)
- [ ] P1.1 DSL factories + closed config schema
- [ ] P1.2 field registry + lenient parse + default-immunity
- [ ] P1.3 canonical serializer + golden byte-identity (fixture mirror)
- [ ] P1.4 GitBackend read ops (truncation assert/fallback; branch param everywhere)
- [ ] P1.5 snapshot store + ETag cache-in-queryFn
- [ ] P1.6 parseUntrustedJson + caps + pollution fixtures
- [ ] P1.7 contract suite read-side (vs FakeGithub AND reference-fixture-backend)
- [ ] P1.8 AuthProvider/PatProvider + capability probe
- [ ] P1.9 admin shell tokens + login screen w/ guided errors
- [ ] P1.10 library screen (groups/search/sort/summaries/thumbnails)
- [ ] P1.11 ServicesProvider + entryIndex
- [ ] P1.12 yve fixture mirror + 6 drift fixtures
- [ ] P1.13 collator + money helper + slug-read prototype
- [ ] P1.14 FakeGithub read handlers + chaos modes
- [ ] ⛔ GATE P1: browse-journey e2e + INV-S01..S06 + P14 + A03(partial) + T01/02/03 green

## P2 — Save pipeline + editor v0 (status: ⬜)
- [ ] C.1 P2.1 commitChanges full path · P2.2 GitError taxonomy/classifier · P2.3 retry+throttle policy
- [ ] ⛔ mini-gate C.1 (INV-P01/02/03/09/14 green vs chaos hooks)
- [ ] C.2 P2.4 invariant engine + rebase() + 11 property tests
- [ ] ⛔ mini-gate C.2 (INV-P05..08 green; decision matrix in ADR-0004 appendix)
- [ ] C.3 P2.5 state machine + lease + drafts + boot replay · P2.6 editor v0 + save bar · P2.7 sweep verdicts + advisory chips · P2.8 deploy-status service · P2.9 conflict freeze UI · P2.10 failure screens + copy composer · P2.11 recorded-fixture capture+replay · P2.12 e2e journeys
- [ ] ⛔ GATE P2: all INV-P + A01/A02 + N01 + D01–03 green; publish-loop demo

## P3 — Widget system complete (status: ⬜)
- [ ] P3.1 list/object infra · P3.2 image widget v1 · P3.3 relation widget · P3.4 hidden repair + drawer · P3.5 slug lifecycle · P3.6 reference-swatch exemplar (ADR-0009 acceptance) · P3.7 templates "Start from" · P3.8 message map + drift-case copy · P3.9 yve config port + parity golden + edit-everything e2e
- [ ] ⛔ GATE P3: yve exact config editable, zero code change (demo)

## P4 — Media system (status: ⬜)
- [ ] P4.1 media service + bijection/budget · P4.2 findReferences · P4.3 worker raster pipeline · P4.4 tile staging + commit-with-entry · P4.5 blob preview cache sha-keyed · P4.6 media library screens · P4.7 delete rungs + tombstone/restore · P4.8 trust e2e (no raw URL; SVG) · P4.9 slow-wifi journey
- [ ] ⛔ GATE P4: INV-M01/02/03 + T04/T05 + N03 green; 9-photo demo

## P5 — Founder polish & IA (status: ⬜)
- [ ] P5.1 global search · P5.2 journal + heartbeats · P5.3 consent pact + tour · P5.4 drift chip · P5.5 conflict freeze completion · P5.6 t() + copy scanner + message map · P5.7 token expiry kit · P5.8 a11y tokens/focus/reorder · P5.9 keyboard/zoom/axe e2e · P5.10 diagnostics + masking re-run
- [ ] ⛔ GATE P5: founder-cry triad scripted; full consent→edit→conflict→failure→recover demo

## P6 — yve cutover (status: ⬜ blocked)
- [ ] 1 fork rehearsal (+revert drill) · 2 site rails · 3 normalization commit · 4 schema contract swap · 5 cutover PR (_headers/noindex) · 6 acceptance journey (+staged build-fail drill) · 7 two-week observation notes
- [ ] ⛔ GATE P6: success criteria §1 all demonstrated on real site; rollback proven

## P7 — OSS publication (status: ⬜ blocked)
- [ ] P7.1 naming final + rename sweep · P7.2 README/CONTRIBUTING/demo · P7.3 Decap importer + harness · P7.4 OAuth worker + auth suite · P7.5 GitLab backend via suite · P7.6 publish 0.1.0 (OIDC) + release artifact · P7.7 guides/changelog
- [ ] ⛔ GATE P7: stranger-test passed; release live

---
*Legend: [ ] open · [x] done w/ evidence · ⛔ GATE = owner-confirmed checkpoint. One phase per chat (AGENTS.md §3).*
