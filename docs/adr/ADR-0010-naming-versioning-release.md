# ADR-0010 — Naming, versioning & release policy (placeholder-until-name; 0.x core; OIDC publishing)

**Status:** Accepted · 2026-10-27 · revisitable at Stage B / P7

## Context
Package name is cosmetic until npm publish but must not leak into code (renaming horror); round-2 delivery-review demanded release discipline from P0 (changesets + headers + least-privilege CI) to avoid publish-day retrofitting.

## Decision
1. **Naming**: working name **MyCMS**; package scope placeholder `@mycms/*` until owner finalizes (P7 gate item). Naming appears ONLY in one constant module + docs headers so a later rename is a find-replace-in-one-file exercise, not archaeology.
2. **Versioning**: `core` = npm package, `0.x` with documented "0.x minor may break" discipline until API freeze (changesets from P0; CHANGELOG generated). `admin` = git tags + GitHub Releases carrying the built dist artifact + SHA-256 checksums. Internal packages version via changesets (private:true is fine) so publish is a flag flip at P7.
3. **Publishing**: npm via **trusted publishing/OIDC** — no stored NPM_TOKEN (standing veto circle). GitHub Releases artifact naming: `mycms-admin-<version>.zip` + checksums.
4. **License**: MIT (draft already committed); final owner line lands at P0 (single listed pick, no license churn later).
5. **ESM-only policy** recorded here (delivery-review consequence): all packages `"type":"module"`, source exports for internal consumption, dist exports for publish; no CJS builds; Node 22 pinned via `.nvmrc` + `engines` (Node 20 EOL'd Apr 2026 — old Toolchain[T2] rejected).
6. **CI supply-chain law** (cross-referenced from security rounds, enforced from P0): job-level `contents: read`, zero `pull_request_target`, SHA-pinned actions, actionlint+zizmor, `onlyBuiltDependencies` committed w/ per-entry reason comments, `security/audit-waivers.yml` (expiry ≤90d auto-fail), Renovate `minimumReleaseAge`, prod dist byte-scan (no sourcemaps/MSW/telemetry strings).

## Consequences
Changesets velocity may feel heavy for solo work — accepted; it's the cheapest discipline that converts an internal tool into a trustable package at P7 without a migration sprint.
### Node pin note (§5 addendum, owner decision 2026-10-27)
- `.nvmrc`/CI stay pinned to 22 (node-version-file) and `engines` requires >=22.12; local dev machines may run any newer Node satisfying engines (current: 24.12). This relaxes the phase-file gotcha reading "Node 22 only" to "engines-honest locally, CI pinned at 22". No repo file hardcodes a local toolchain version.

### P0 verification (2026-10-27)
- Encoded and running: pnpm 10.34.9 pinned via `packageManager` (the spec pins the pnpm 10 major; pnpm 12 exists at P0 time — staying on the pinned major, revisit at P7); frozen-lockfile CI install; exact catalog pins; `onlyBuiltDependencies` committed with per-entry reason comments (install runs with zero blocked-script warnings); `security/audit-waivers.yml` schema + waiver-filter script green; `renovate.json` with `minimumReleaseAge: 7 days` + manual-review majors (Radix/octokit/React/TS/vite); SHA-pinned actions, job-level `contents: read`, zero `pull_request_target`, all mechanically enforced on our own workflows by `scripts/ci-workflow-guard.mjs`; prod dist byte-scan (`scripts/prod-purity-scan.mjs`); changesets wired with private packages version-only (never published/tagged) so publishing is a deliberate flag-flip at P7.
- Recorded deviations (2026-10-27): (a) tsup runs with `dts: false` — TS 7 ships no compiler API for rollup-plugin-dts; `tsc -b` emits per-package declarations into `dist-types`, and d.ts bundling for publish is re-evaluated at P7; (b) actionlint/zizmor external scanning deferred to the OSS phase — the enforceable subset (SHA-pinning, least privilege, banned triggers) is mechanically checked by the internal workflow-guard script.
