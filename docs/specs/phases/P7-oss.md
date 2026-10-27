# Phase P7 — OSS publication (Stage B opener)

> Status: ⬜ · Prev gate: P6 ✅ + owner go-ahead · NEW chat required

## Pre-flight checklist
- [ ] P6 ✅ + owner explicitly authorizes OSS work (2-week observation done too)
- [ ] ADR-0010 (naming/versioning/release) — final decision time for name/scope
- [ ] `tasks/todo.md` § P7 loaded

## Goal
Publish MyCMS as a package others can adopt: docs that make a stranger productive without asking questions, importer for the Sveltia/Decap exodus, the OAuth Worker (fills the AuthProvider seam), GitLab via the contract suite, release machinery live.

## Deliverables
- Naming: final package name/scope → ADR-0010 updated; `@scope/core` published 0.1.0 via OIDC trusted publishing; admin Releases w/ dist artifact + checksums
- Docs: full README (pitch/threat-model/quickstart), CONTRIBUTING (exact commands + "how to register a widget/backend"), SECURITY.md scope refresh (OAuth edition), demo deployment of playground
- Decap `config.yml` importer: known widgets 1:1 mapping; unknown → `text` + loud warning (never trusted passthrough); regression harness = parity golden run against config.yml fixtures (INC-C01's importer twin)
- OAuth Worker package: GitHub OAuth app → JWT→PAT exchange worker (sveltia-cms-auth pattern reference), AuthProvider impl passes auth-side contract suite; SECURITY.md updated (token now transits worker briefly; scope statement rewritten)
- GitLab backend: passes full shared contract suite (ADR-0001 gate) — first real foreign-backend proof
- Optional-user features assessment (call, do not build unless needed): staging-branch PR mode, WYSIWYG, i18n
- Release practice: changeset → release → publish dry-run on a tag; CHANGELOG polish

## Tasks (plan.md P7.1–P7.7)
- [ ] 1. Naming final + ADR-0010 + rename sweep (single-constant rule proves itself)
- [ ] 2. README/CONTRIBUTING/SECURITY refresh + demo deploy
- [ ] 3. Decap importer + fixture regression harness
- [ ] 4. OAuth worker package + auth contract tests + docs
- [ ] 5. GitLab backend via contract suite (chaos modes included)
- [ ] 6. Publish pipeline: OIDC dry-run → real 0.1.0; GitHub Release artifact w/ checksum
- [ ] 7. Backfill: `runtime docs` (widget author guide from exemplars; backend author guide from suite) + blog-ready changelog

## Gotchas
- Importer must NEVER auto-write content; preview + owner-confirmed write only.
- OAuth flow changes the threat model — SECURITY.md scope/table update is part of acceptance, not follow-up work.
- Contract suite changes for GitLab = new suite version → changeset bump discipline.

## Exit gate
- [ ] Stranger-test: a fresh agent/PERSON completes exemplar widget + backend README tasks without questions (record in log)
- [ ] 0.1.0 published + demo live + importer harness green
- [ ] AGENTS.md: P7 ✅; Stage B backlog (Appendix B) reviewed with owner; archival note

## Session log
- (none yet)
