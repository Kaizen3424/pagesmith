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
