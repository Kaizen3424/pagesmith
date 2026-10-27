# ADR-0003 — Zod-first config: schema factories carrying metadata; closed validation; versioned schema

**Status:** Accepted · 2026-10-27

## Context
Genesis §2 identified the zod "metadata deficit": `z.string().min(3)` validates but carries no UI info, and `.describe()` metadata is weakly typed. Attempting pure-zod parsing also risks silently deleting dev-owned/hidden fields and can't know widget structure. The incumbent's 6 config-vs-zod drift cases prove drift kills trust.

## Decision
1. **Schema factory pattern (owner's genesis recommendation, adopted as the DSL)**: `fields.string({...})` returns a **zod schema carrying CMS metadata** (widget type + field config + identity); `z.object({...})` composes them; `defineCollection({name, folder, format, schema, view:…})` wraps collection options. Zod remains the single validation engine end-to-end (compile-time for host apps, runtime for admin/validation sweeps).
2. **Closed config schema**: config documents parse via `z.strictObject` + discriminated union of the exact registered widget types; unknown widget/type = validation error naming collection+field (never silent passthrough → never mis-typed edits). Config is **data, never code** — no TS-module configs in v1 (eliminates arbitrary code in the admin bundle).
3. **Round-trip preservation**: field types model a **projection** — parse returns `{value, issues, untouched}` where `untouched` = unmodeled raw keys, copied verbatim (genesis §2 "dev-owned fields" requirement, upgraded to the lenient read/strict save contract). **Parse is default-immune** (round-2): no key injection on open; defaults materialize only via the new-entry/template leaf-first fold.
4. **schemaVersion + unknown-value policy**: config carries a version; value-level evolution (string→select etc.) writes migration notes in commit bodies rather than destroying data; renames of fields are preserved as untouched until owner-migrated.
5. **Drift-free cutover**: host build (yve `content.ts`) imports schemas FROM this package so admin validation ≥ build gate by construction; CI fixture pins the 6 incumbent drift cases (INV-C02).
6. Metadata keys are symmetrical to the genesis sketch: `label, hint, required, default` + widget-specific (`folder, min/max, options(label→value), valueField/displayField/searchFields, itemTemplates/summaries`).
7. Supplementary primitives: `divider` = decoration-only field (no value); `slug` = hidden virtual path-derived field; cross-collection reference display resolution is provided via validator context `services{entryIndex, readEntry, siblingValues}` (async context validation accepted from genesis §2 — owned by admin's ServicesProvider, see ADR-0009 boundary).

## Consequences
- All 12 field types must be expressible in the factory pattern incl. nested list-of-list (the incumbent's "choice tabs") — verified by the parity golden test (INV-C01).
- Strict parse means the importer path (Stage B) maps unknown widgets to `text` + loud warnings, never trusted passthrough.
- Error codes, not prose, from zod → human message map (01-spec §7).
### P0 verification (2026-10-27)
- Vocabulary pinned now: `CONFIG_SCHEMA_VERSION = 1` + the 12-name `FieldTypeName` union (packages/core/src/config, packages/core/src/fields); zod schema factories + the strict/lenient duality land P1.1/P1.2. No deviation.
