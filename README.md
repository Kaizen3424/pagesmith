# MyCMS

> A git-backed, zero-database CMS: a framework-agnostic TypeScript core + a fully brandable React admin. Content stays as plain JSON files in your GitHub repository; the admin talks to `api.github.com` directly — **your token never leaves the browser, and there is no server to run.**

<p align="center"><strong>STATUS: P0 complete (gate passed 2026-10-27)</strong> — monorepo skeleton, CI, and law-encoding seams are in and green locally (incl. clean-clone install); P1 (config schema + read path) is next. See <code>AGENTS.md</code>.</p>

## Why

Existing git-based CMS options (Sveltia/Decap family, Tina, Keystatic, Pages CMS) force one of: a frozen admin skin, framework lock-in, a database, or paid hosting. MyCMS takes the empty middle:

| Want | Sveltia/Decap | Tina/Keystatic/Pages | Storyblok/Sanity | **MyCMS** |
|---|---|---|---|---|
| No database | ✅ | ✅/partial | ✅ managed cloud | ✅ |
| Free | ✅ | partial/paid tiers | ✅ free tier | ✅ |
| Admin UI you own / theme | ❌ frozen | partial/locked | partial | ✅ (tokens + brand packs) |
| Zod-native validation shared with the site build | ❌ | ❌ | custom | ✅ (drift impossible) |
| Github-only backend, plain JSON content | ✅ | ✅ | cloud lake | ✅ |

## Threat model (one sentence)

All GitHub access happens browser-side with a **fine-grained, single-repo PAT** (`Contents: read+write`, `Checks: read`); the admin page loads zero third-party scripts under a pinned CSP, so leakage requires an XSS compromise of this origin — see `SECURITY.md`.

## Repository map (once P0 lands)

```
packages/core/    headless SDK: config zod builders · field registry · transactional GitHub backend
                  (blobs→tree→commit→FF ref) · save pipeline/rebase · draft store · safety utils
packages/admin/   React SPA: library/editor/media screens · widget bindings · CSS-var theming
playground/       MSW FakeGithub dev harness + fixture repositories (contract-suite target)
e2e/              Playwright journeys vs the playground build
docs/             specs · ADRs · yve integration reference
tasks/            plan.md + todo.md (live checklist)
```

## Quickstart

Requires Node ≥22.12 (CI pins 22 via `.nvmrc`) and pnpm (enabled via corepack, version-pinned by the root `packageManager` field):

```
corepack enable pnpm
pnpm install --frozen-lockfile   # CI-parity install
pnpm -r typecheck                # tsc over project references
pnpm run check                   # biome — lint + format (errors on warnings)
pnpm -r test                     # vitest workspaces (core has a coverage gate on)
pnpm -r build                    # tsup (core) · vite build (admin, playground)
pnpm e2e                         # Playwright chromium smoke vs the playground build
```

At P0, `packages/admin` is the React 19 shell (design tokens + login route) and `playground` is the MSW FakeGithub harness — editing surfaces land in P1+.

## License

MIT — see `LICENSE`.
