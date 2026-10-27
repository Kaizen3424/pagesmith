# Phase P0 — Scaffold & laws

> Status: ✅ gate passed 2026-10-27 (owner confirmation in chat) · Prev: none · NEXT: P1 (`docs/specs/phases/P1-config-read.md`) — owner starts it in a NEW chat

## Pre-flight checklist
- [x] `AGENTS.md` read (status board = P0, never start another phase)
- [x] `docs/specs/01-spec.md` read fully; `invariants.md` skimmed (env-invariants land here)
- [x] ADRs to load now: **0001, 0002 (sign-off context), 0003, 0004, 0005** — all ten verified implementable as written (P0-verification notes appended); no mid-scaffold deviations opened
- [x] `docs/reference/yve-inventory.md` skimmed (fixture mirror shapes your playground data)
- [x] `tasks/todo.md` § P0 + `tasks/plan.md` § P0 loaded

## Goal
A CI-verifiable monorepo skeleton with every law already encoded (boundaries, taxonomy, contract-suite harness, security policy files), and repo hygiene done once — so P1+ only ever builds features on a green foundation. **No feature work in P0.**

## Deliverables (paths)
- `package.json` (root) + `pnpm-workspace.yaml` (catalog! `onlyBuiltDependencies` w/ reason comments) · `packages/core` · `packages/admin` · `playground` · `e2e`
- `.nvmrc` (22) + `engines`; biome config; vitest config + fast-check dep; changesets (`.changeset/config.json`) · CI workflow `.github/workflows/ci.yml` + scheduled audit job
- `security/audit-waivers.yml` (schema + zero entries) · finalized `LICENSE` owner line · finalized `README.md` quickstart (commands actually runnable)
- `packages/core/src/backends/reference-fixture-backend/` stub + `core` contract-suite runner stub · `playground/` shell: vite app + MSW **FakeGithub** skeleton + fixture-repo shape (dirs mirroring yve layout: `src/content/**`, `public/images/**`)
- `AGENTS.md` §6 command table updated to EXACT working commands

## Tasks (tick only with verify evidence — details in plan.md Task P0.1–P0.12)
- [x] 1. git init + trunk-based conventions + `packageManager` pinned + root README/AGENTS cleanliness pass — committing convention lands in CONTRIBUTING.md; packageManager pinned in P0.2 commit (chore(repo) 5718a34)
- [x] 2. pnpm workspace + catalog (React 19, zod, tsup, vitest, biome, playwright, fast-check, idb-keyval, MSW) — install green w/ frozen lockfile — catalog exact-pins the sanctioned stack (+ TanStack Router/Query, RHF, Tailwind v4, Radix modular per D2); frozen-lockfile install green incl. from clean clone (0bbebf3)
- [x] 3. Accept-by-run `onlyBuiltDependencies` list committed (`esbuild`, `lightningcss`, `@tailwindcss/oxide`; NOT playwright/shiki) — each with reason comment — committed list verified by an install run with ZERO blocked-script warnings; esbuild postinstall explicitly ran (0bbebf3)
- [x] 4. Core package skeleton: `src/{config,fields,backend,pipeline,auth,drafts,cache,safety,web}` barrels + placeholder types + `__tests__` echo test; `tsup` lib build green — 16 tests green, core coverage gate 96.9% lines; tsup ESM build green (7912657)
- [x] 5. Admin package skeleton: vite React 19 + Tailwind v4 tokens shell + TanStack Router/Query + RHF wired (empty screens) + Radix modular packages — dev server shows login shell route — preview server serves the login-shell build (checked via HTTP); visual demo shown at the gate (90eb9e2)
- [x] 6. Playground shell: MSW handlers module + fixture repo loader + contract-suite runner stub + env-kill guard (`MYCMS_ALLOW_REAL_GITHUB`) with unit test — runner + SHAPE_CHECK live in core (ADR-0001 home); playground FakeGithub handlers + loader with 7 unit tests green (77b1a2f)
- [x] 7. E2E skeleton: playwright config chromium-only, one smoke spec hitting playground preview, catch-all origin-allowlist assertion active from day 1 — smoke green locally and in the clean-clone run (f3df318)
- [x] 8. CI: resolve → install frozen → typecheck (tsc -b) → biome check --error-on-warnings → vitest (core coverage gate on) → build all → e2e smoke; job-level `permissions: contents: read`; SHA-pinned actions; audit scheduled job (waiver-filtered) — ci.yml committed; SHA-pins resolved from real GitHub tags; least-privilege + banned triggers mechanically self-enforced (6b8024c); CI executes on first push (owner-scheduled)
- [x] 9. Changesets wired (`pnpm changeset` runs; version:skip for private admin) + root `.changeset` sanity — `pnpm changeset status` green; interpretation fixed to publish-skip-only (private packages stay versioned — ADR-0010), plan.md wording updated (bf9f50e)
- [ ] 10. LICENSE owner line finalized (OWNER INPUT — ask in chat, don't guess) — DEFERRED by owner decision 2026-10-27 ("decide later"); keeps ⛔ GATE open
- [x] 11. ADR cross-check session: ADRs 0001–0010 each get a "verified implementable" note or deviation opened — all ten signed with P0-verification notes; ADR-0010 carries the owner-dated Node-addendum + two recorded toolchain notes
- [x] 12. `AGENTS.md` §6 finalized w/ real commands; `01-spec.md §3` flags "materialized P0" removed — both materialized 2026-10-27 (exact flags incl. the three supply-chain guard commands)

**Phase-specific invariants w/ tests:** INV-N05 (origin allowlist smoke runs in CI) · INV-S05 (grep gate exists, suite stub) · INV-A05 (masking test stub green) · INV-N02 setup (truncation assert utility exists, used from P1)

## Gotchas (panel notes)
- Do NOT commit fixture PATs anywhere; sandbox-repo credentials live outside the repo (env or gh-secret only).
- `pnpm approve-builds` once, then COMMIT the resulting allowlist — prompt-driven accept-all = vetoed pattern.
- Vite must treat workspace packages as source (`resolve.dedupe` React; internal exports = src) — do not pre-build internal packages in dev.
- Node 22 only; do not drift engines "temporarily". (Owner decision 2026-10-27, recorded in ADR-0010 §5 addendum: engine files stay pinned at 22 / `engines` ≥22.12; local dev machines may run newer Node satisfying engines.)

## Exit gate (all must be ✅ + owner confirmation IN CHAT)
- [x] `pnpm install --frozen-lockfile` passes from a clean clone state; `pnpm -r typecheck && pnpm biome check && pnpm -r test` all green — VERIFIED in a fresh clone at bf9f50e (2026-10-27)
- [x] `pnpm -r build` + e2e smoke green locally; CI file committed (validated on first push — schedule the push when you finish) — build + e2e green locally AND in the clean clone; push scheduled by owner, CI run validates remotely
- [x] Changeset file + audit-waivers schema present; LICENSE finalized — changesets ✅ + waiver schema ✅; LICENSE line finalized 2026-10-27 ("Kaizen" — Copyright (c) 2026 Kaizen and MyCMS contributors)
- [x] ADR 0001–0010 signed-off notes recorded (no deviation OR deviation discussed + spec updated) — ten P0-verification notes, no deviations; two toolchain notes recorded on ADR-0010
- [x] `tasks/todo.md` P0 section fully ticked; AGENTS.md status row P0 → ✅; focus → P1; phase log appended — done 2026-10-27; gate confirmation received from the owner in chat

## Session log
- 2026-10-27 — POST-GATE HOTFIX: first remote push failed CI run #1 (13s) — root cause: `ci-workflow-guard.mjs` (pre-install step) and `audit-waiver-filter.mjs` (zero-install scheduled job) imported the npm `yaml` package → `ERR_MODULE_NOT_FOUND` with no node_modules; reproduced locally by hiding node_modules/yaml. Fix `4050ab9`: both scanners now dependency-free via `scripts/yaml-subset.mjs` (fail-closed strict subset parser, 12-case RED/OK matrix green, zero-install parity proven); no `ci.yml` change; ADR-0010 addendum recorded. CI run #2 GREEN: https://github.com/Kaizen3424/pagesmith/actions/runs/40456643688 (session)
- 2026-10-27 — ⛔ GATE P0 PASSED: owner confirmed in chat after the live demo; P0.10 closed (LICENSE line: "Kaizen"); all P0 gate items ticked; remote chosen by owner = `https://github.com/Kaizen3424/pagesmith.git` (final naming sweep stays P7.1 — working name MyCMS until then); status board P0 → ✅, focus → P1 (session)
- 2026-10-27 — P0 executed across the approved 12-slice order: P0.1–P0.9 + P0.11–P0.12 committed (P0.10 LICENSE deferred by owner); local gate AND fresh-clone gate green (install frozen / typecheck / biome / vitest+coverage / build / prod-purity / e2e); toolchain: pnpm 10.34.9, TS 7.0.2 (tsup dts:false noted on ADR-0010), Vite 8, Vitest 5, Biome 2.6; stop at ⛔ GATE P0 — owner demo + confirmation next, LICENSE line + repo push owed (session)
