# MyCMS

> A git-backed, zero-database CMS: a framework-agnostic TypeScript core + a fully brandable React admin. Content stays as plain JSON files in your GitHub repository; the admin talks to `api.github.com` directly — **your token never leaves the browser, and there is no server to run.**

<p align="center"><strong>STATUS: pre-scaffold (P0 not started)</strong> — this repo currently contains specifications only. See <code>AGENTS.md</code> for the operating manual and <code>docs/specs/</code> for the plan.</p>

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

Not yet materialized — created in P0. Until then, this repo is documentation-only by design.

## License

MIT (draft) — see `LICENSE` (owner name finalizes at P0).
