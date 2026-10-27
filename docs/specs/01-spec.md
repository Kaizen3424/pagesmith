# Spec: MyCMS (six-area specification)

> Status: **Approved for P0** (gated per phase by owner review). Canon ancestry: `00-master-plan.md` ← owner `concepts_brief.md` ← 2-round adversarial panel (4 reviewer sessions). Deltas vs genesis: §2.3. This is a living document — see AGENTS.md §6.

## 1. Objective

Build a **git-backed, zero-database CMS package** for a non-technical founder:

- `packages/core` — framework-agnostic TS SDK: zod-first config, field-type registry, **transactional GitHub backend** (single-commit multi-file writes, FF-only CAS), save pipeline with conflict semantics, IndexedDB drafts, safety utils. Zero DOM, zero React.
- `packages/admin` — a fully brandable React 19 SPA (dark-luxury default): library, entry editor, media, settings, founder-first UX. Themeable via CSS-var design tokens + config brand pack.
- `playground/` — MSW **FakeGithub** dev harness + fixture repositories; must pass the core **contract suite** (the same suite every backend implementation must pass).
- `e2e/` — Playwright (chromium-only) journeys vs the playground build, incl. origin-allowlist + prod-purity assertions.

**Users:** (1) the site owner — configures collections, authors widgets, integrates; (2) the **non-technical founder** — edits content; every screen she touches is judged by the founder-cry prevention set (master-plan §7).

**Success criteria (v1 = Stage A, all must be demonstrably true at P6):**
1. Replaces Sveltia at yve's `/admin` with `/admin-legacy` rollback intact (one-PR swap).
2. Founder completes unaided: product edit (price/text/image swap), product create via template, collection edit, page-document edit, settings edit — each ending in per-entry "Live ✓" status.
3. Zero silent-failure paths: every failure has a human-phrased surface + "Copy message for [partner]".
4. yve build gate imports schemas from this config package; the 6 known incumbent drift cases are pinned by CI fixture (both sides fail together).
5. §4 Testing tiers + `invariants.md` checklist all green; security invariants enforced in CI.

**Stage B (v2, explicitly parked):** Decap importer, OAuth Worker, GitLab, PR/staging-branch mode, WYSIWYG markdown, i18n, visual preview. See `00-master-plan.md §Appendix B`.

## 2. Decisions in force (archive pointers)

### 2.1 Locked decisions table

Condensed — full rationale lives in `docs/adr/`. Rows D1–D10, token-storage conditions, PR-mode deferral, schema-contract swap, no-time-estimates rule: see `00-master-plan.md §2`.

### 2.2 Standing panel vetoes (must never regress)

`force:true` · `raw.githubusercontent.com` reads · token-in-URL · `dangerouslySetInnerHTML`/`eval`/`innerHTML` · telemetry of any kind · unsafe merges on parsed JSON · second serializer bypassing the save path · backend/token access in `WidgetProps` · whole-entry conflict buttons (field-granularity only) · gating unrelated saves on unrelated file failures · editing `/admin-legacy` · deleting tests for green. (Master-plan §13.)

### 2.3 Genesis deltas (concepts_brief.md → hardened plan)

The owner's v0 brainstorm remains design-valid; these loads reflect what the panel/locks changed:

| Genesis said | In force now | Where |
|---|---|---|
| 12 widgets incl. `markdown/richtext basic` | richtext = v2 (+ DOMPurify ADR first); 12 stock types + virtual `slug`; `divider` kept as decoration primitive | master-plan §6 / §B |
| PAT + OAuth worker redirect in v1 | PAT-only v1; worker fills `AuthProvider` seam in Stage B | master-plan §2 D5 |
| Admin also exported as npm components | v1 = turnkey static SPA bundle (+ in-repo source consumption); npm component export = Stage B decision | ADR-0001 §C |
| Canvas media resize | **OffscreenCanvas/worker-based** resize (UI-thread safe), EXIF stripped by re-encode | ADR-0007 |
| Draft key `${repo}/${collection}/${slug}` | absorbed verbatim (+ staged media tiles keyed alongside; lease-table see ADR-0004/§5) | 01-spec §5 / P2 |
| Async context validation for relations | absorbed — validator context = `services{entryIndex, readEntry, siblingValues}`; adds verdict-class logic | master-plan §5 / P2 |

## 3. Commands

Materialized 2026-10-27 (AGENTS.md §6 mirrors). Exact set:

```
pnpm install --frozen-lockfile     # CI-parity install (pnpm pinned via root packageManager)
pnpm -r typecheck                  # per-package `tsc -b .`; `pnpm typecheck` at root = tsc -b over project references
pnpm run check                     # biome check --error-on-warnings .  (lint + format)
pnpm -r test                       # vitest across workspaces (core runs with the coverage gate on)
pnpm --filter @mycms/core test -- src/__tests__/echo.test.ts   # focused (any colocated test file)
pnpm e2e                           # playwright --project=chromium vs the playground build (webServer builds + previews it)
pnpm -r build                      # tsup (core, ESM-only) · vite build (admin + playground)
pnpm changeset                     # version discipline from day one; `pnpm changeset status` = non-interactive sanity
pnpm run scan:workflows            # guard: SHA-pinned actions, job-level contents: read, no pull_request_target
pnpm run scan:prod-purity          # admin dist byte-scan (INV-N04 posture)
pnpm run audit:waivers             # pnpm audit --json | node scripts/audit-waiver-filter.mjs (scheduled CI job)
```

Test-file location rule: colocated `__tests__` for core (`src/<module>/__tests__/x.test.ts`), centralized in `e2e/` for journeys, MSW parity fixtures shared from `playground/fixtures/`.

## 4. Testing strategy

Four tiers (full invariant→test mapping: `docs/specs/invariants.md`):

| Tier | Target | Tooling | Gate |
|---|---|---|---|
| L0 pure unit | field registry, serializers, safePath/Url, mustache-lite, collator, slug pipeline, rebase property tests, goldens | vitest, fast-check (property tests) | core coverage ≥90% lines on `pipeline/`,`fields/`,`safety/` |
| L1 contracts | core contract suite vs **FakeGithub**; GithubBackend additionally vs **recorded HTTP fixtures** (sandbox-captured, redacted) | vitest + MSW | suite + fixtures green at every CI run |
| L2 journeys | Playwright vs playground **build**; `page.route('**/api.github.com/**')` mocks + shared fixtures; **catch-all route aborts non-allowlist origins**; prod-purity byte-scan (no sourcemaps/MSW/telemetry strings) | Playwright chromium | all journey specs green |
| L3 manual | fork rehearsal, normalization commit, cutover acceptance, live smoke | human, scriptable checklists | phase files' exit gates |

Property-tested invariants (rebase ×11, conflict predicate, serializer byte-identity) are non-negotiable; each maps to a named test file in `invariants.md`.

## 5. Project structure

See master-plan §3 (monorepo tree) — authoritative. Addenda locked here:

- **Draft records** (core/drafts): key = `${repo}/${collection}/${slug}` for entry drafts; media tiles stored alongside per-entry (`${repo}/${collection}/${slug}/media/${n}`); settings docs keyed by file path. Draft store API = injected `DraftStore` interface (IDB impl in `core/web`), **Node-safe core** (no IDB import outside `core/web`).
- **Composition root**: `createMyCMS({backend, storage, logger, clock, fetch})`; admin mount: `mountAdmin(el, {config, support:{name}, repository, fetch?, tokenStore?})`. The P1 host-wiring addendum (ADR-0001) makes the repository target and browser seams explicit; core still owns no concrete IDB/network implementation. Fakes implement the same interfaces (backend impls must ALSO pass the shared contract suite - ADR-0001/0009).
- **Admin dual registry**: `core/fields` = pure `defineFieldType` (parse/serialize/validate/effect, no React/IO); `admin/widgets` = `defineWidget(fieldTypeName, Component)` joined **by name**; custom `WidgetProps{value, onChange, error, fieldConfig, useField(), services}` — never `backend`/token (standing veto). Exemplar custom widget: `packages/admin/src/widgets/reference-swatch/`; exemplar backend: `packages/core/src/backends/reference-fixture-backend/` (ADR-0009).

## 6. Boundaries

**Always:** run focused tests before ticking tasks · write ADR before the mechanism lands · branch-as-parameter everywhere · Conventional Commits + `chore(cms):` prefix for content commits · untrusted-input discipline (`parseUntrustedJson()`, `safePath()`, `safeUrl()`, mustache-lite text nodes) · mask logs (token/emails) · keep specs & todos current (AGENTS.md §6).

**Ask first:** new dependencies (runbook PR + `onlyBuiltDependencies` reason-comment) · config/schema format changes · CI/workflow edits (least-privilege: job `contents: read`, SHA-pinned actions, no `pull_request_target`) · anything touching the yve repo · storage/token-handling deltas (ADR-gated) · deleting the audit-gate via waivers (`security/audit-waivers.yml`, expiry ≤90d).

**Never:** standing vetoes (§2.2 above) · "temporary" bypasses of masking/CSP/allowlist · force-pushes anywhere · committing secrets (tokens NEVER enter repo, fixtures use redacted placeholders).

## 7. Code style (canon exemplar)

Shape of all core modules: named exports only, `readonly` types, Result-shaped returns **never throwing** on parse, one concern per file, docblock header stating the owning ADR.

```ts
// packages/core/src/fields/string.ts — field type exemplar (ADR-0003, ADR-0004)
import { z } from "zod";

export interface StringFieldConfig {
  readonly label: string;
  readonly hint?: string;
  readonly required?: boolean;
}

/**
 * Schemas return zod instances CARRYING CMS metadata (genesis §2 pattern):
 * zod stays the validator; the wrapper adds widget info & field identity.
 */
export function stringField(config: StringFieldConfig) {
  const schema = z.string({ message: "REQUIRED" /* code, not prose */ }).min(1);
  return defineField({ type: "string", schema, config });
}

// parse contracts are Result-shaped — reading legacy/bad data must render, not crash:
export type ParseResult<V, R> = {
  readonly value: V;                       // validated projection
  readonly issues: readonly ParseIssue[];  // {path, code, detail} — codes, never prose
  readonly untouched: ReadonlyMap<string, unknown>; // unmodeled keys, verbatim (round-trip)
};
```

Conventions: camelCase functions / PascalCase types+zod variables; error codes UPPER_SNAKE rendered via the message map (founder prose lives in one map, never inline); UI copy through `t()` with interpolated names — **no sentence concatenation**; biometric vocabulary ban-list on founder surfaces (build/commit/deploy/token/slug/repository → human words; `[partner]` = config `support.name`).

## 8. Open questions (parked, non-blocking)

1. Final package name + npm scope — ADR-0010 placeholder until Stage B.
2. LICENSE owner line — finalize at P0 (owner supplies the name once).
3. Light-theme tokens beyond the dark-luxury default — tokens structurally support it; first light pack = Stage B demo.

---
*Reworked from `00-master-plan.md` written 2026-10-27 after two adversarial panel rounds.*
