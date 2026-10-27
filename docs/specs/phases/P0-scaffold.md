# Phase P0 — Scaffold & laws

> Status: ⬜ · Prev: none · Owner starts in NEW chat after reading AGENTS.md

## Pre-flight checklist
- [ ] `AGENTS.md` read (status board = P0, never start another phase)
- [ ] `docs/specs/01-spec.md` read fully; `invariants.md` skimmed (env-invariants land here)
- [ ] ADRs to load now: **0001, 0002 (sign-off context), 0003, 0004, 0005** — you are creating the world they describe; confirm each is implementable as written, else raise deviation BEFORE scaffolding (living-spec rule)
- [ ] `docs/reference/yve-inventory.md` skimmed (fixture mirror shapes your playground data)
- [ ] `tasks/todo.md` § P0 + `tasks/plan.md` § P0 loaded

## Goal
A CI-verifiable monorepo skeleton with every law already encoded (boundaries, taxonomy, contract-suite harness, security policy files), and repo hygiene done once — so P1+ only ever builds features on a green foundation. **No feature work in P0.**

## Deliverables (paths)
- `package.json` (root) + `pnpm-workspace.yaml` (catalog! `onlyBuiltDependencies` w/ reason comments) · `packages/core` · `packages/admin` · `playground` · `e2e`
- `.nvmrc` (22) + `engines`; biome config; vitest config + fast-check dep; changesets (`.changeset/config.json`) · CI workflow `.github/workflows/ci.yml` + scheduled audit job
- `security/audit-waivers.yml` (schema + zero entries) · finalized `LICENSE` owner line · finalized `README.md` quickstart (commands actually runnable)
- `packages/core/src/backends/reference-fixture-backend/` stub + `core` contract-suite runner stub · `playground/` shell: vite app + MSW **FakeGithub** skeleton + fixture-repo shape (dirs mirroring yve layout: `src/content/**`, `public/images/**`)
- `AGENTS.md` §6 command table updated to EXACT working commands

## Tasks (tick only with verify evidence — details in plan.md Task P0.1–P0.12)
- [ ] 1. git init + trunk-based conventions + `packageManager` pinned + root README/AGENTS cleanliness pass
- [ ] 2. pnpm workspace + catalog (React 19, zod, tsup, vitest, biome, playwright, fast-check, idb-keyval, MSW) — install green w/ frozen lockfile
- [ ] 3. Accept-by-run `onlyBuiltDependencies` list committed (`esbuild`, `lightningcss`, `@tailwindcss/oxide`; NOT playwright/shiki) — each with reason comment
- [ ] 4. Core package skeleton: `src/{config,fields,backend,pipeline,auth,drafts,cache,safety,web}` barrels + placeholder types + `__tests__` echo test; `tsup` lib build green
- [ ] 5. Admin package skeleton: vite React 19 + Tailwind v4 tokens shell + TanStack Router/Query + RHF wired (empty screens) + Radix modular packages — dev server shows login shell route
- [ ] 6. Playground shell: MSW handlers module + fixture repo loader + contract-suite runner stub + env-kill guard (`MYCMS_ALLOW_REAL_GITHUB`) with unit test
- [ ] 7. E2E skeleton: playwright config chromium-only, one smoke spec hitting playground preview, catch-all origin-allowlist assertion active from day 1
- [ ] 8. CI: resolve → install frozen → typecheck (tsc -b) → biome check --error-on-warnings → vitest (core coverage gate on) → build all → e2e smoke; job-level `permissions: contents: read`; SHA-pinned actions; audit scheduled job (waiver-filtered)
- [ ] 9. Changesets wired (`pnpm changeset` runs; version:skip for private admin) + root `.changeset` sanity
- [ ] 10. LICENSE owner line finalized (OWNER INPUT — ask in chat, don't guess)
- [ ] 11. ADR cross-check session: ADRs 0001–0010 each get a "verified implementable" note or deviation opened
- [ ] 12. `AGENTS.md` §6 finalized w/ real commands; `01-spec.md §3` flags "materialized P0" removed

**Phase-specific invariants w/ tests:** INV-N05 (origin allowlist smoke runs in CI) · INV-S05 (grep gate exists, suite stub) · INV-A05 (masking test stub green) · INV-N02 setup (truncation assert utility exists, used from P1)

## Gotchas (panel notes)
- Do NOT commit fixture PATs anywhere; sandbox-repo credentials live outside the repo (env or gh-secret only).
- `pnpm approve-builds` once, then COMMIT the resulting allowlist — prompt-driven accept-all = vetoed pattern.
- Vite must treat workspace packages as source (`resolve.dedupe` React; internal exports = src) — do not pre-build internal packages in dev.
- Node 22 only; do not drift engines "temporarily".

## Exit gate (all must be ✅ + owner confirmation IN CHAT)
- [ ] `pnpm install --frozen-lockfile` passes from a clean clone state; `pnpm -r typecheck && pnpm biome check && pnpm -r test` all green
- [ ] `pnpm -r build` + e2e smoke green locally; CI file committed (validated on first push — schedule the push when you finish)
- [ ] Changeset file + audit-waivers schema present; LICENSE finalized
- [ ] ADR 0001–0010 signed-off notes recorded (no deviation OR deviation discussed + spec updated)
- [ ] `tasks/todo.md` P0 section fully ticked; AGENTS.md status row P0 → ✅; focus → P1; phase log appended

## Session log
- (none yet)
