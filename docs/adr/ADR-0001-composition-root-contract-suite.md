# ADR-0001 — Composition root + backend contract suite

**Status:** Accepted · 2026-10-27 · Owner: core architecture

## Context
Core must stay framework-agnostic and test-unaware, yet admin/fakes/real backends need one wiring point, and every backend implementation (GithubBackend today; fixture-exemplar; GitLab in Stage B) must be proved against the SAME behavior contract — not just against its own tests.

## Decision
- Everything is injected at a single composition root: `createMyCMS({ backend, storage, logger, clock, fetch })`; admin mounts via `mountAdmin(el, {config, support:{name}})`. Core imports NO concrete IDB/session/network impls — those live behind interfaces in the `core/web` subpath (keeps core Node-safe).
- The backend must pass a runnable **contract suite** shipped in core: ref-race, truncated tree, 409/422 classes, batch atomicity, pagination/fallback, rename safety, plus chaos hooks (latency/partial-failure/409 injection) so FakeGithub and e2e can drive conflict UX deterministically.
- Packaging consequence (resolution of genesis open-question #1): v1 ships a **turnkey static admin bundle** (deploy dist) + in-repo source consumption; npm-exporting admin components to consumers is a Stage B decision, recorded when needed (this ADR stays the seam).

## Consequences
- Alpha package names/scope stay placeholder until ADR-0010 finalization.
- Contract suite doubles as the GitLab/other-backend acceptance gate (first-contributor magnet).
- Fakes cannot silently drift from the real backend: shared suite + shared fixtures.

## Alternatives rejected
Framework-coupled core (loses Stage-B portability); separate test doubles per backend (drift risk — exactly what round-1 flagged).
### P0 verification (2026-10-27)
- Implemented as written in code: single composition root `createMyCMS(deps)` (frozen deps, core stays node-safe) + `defineContractSuite`/`runContractSuite` runner + `SHAPE_CHECK` + the `FixtureBackend` exemplar stub passing the same suite (packages/core/src).
- The echo test executes the full public module graph (packages/core/src/__tests__/echo.test.ts). Signed off by the P0 agent session under the owner-approved 12-slice plan — no deviation.
