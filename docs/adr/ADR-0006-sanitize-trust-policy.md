# ADR-0006 — Sanitize/trust policy: text-node templates, safePath/safeUrl, prototype-free parse, SVG rejection

**Status:** Accepted · 2026-10-27

## Context
The admin renders **untrusted repo content** (entry values, config templates like `{{title}} · € {{price}}`, media paths) in an origin holding a PAT — the highest-value XSS target imaginable (stored XSS with write privileges). Security round-1/2 enumerated every sink: template strings, URLs, SVG paths, merges, deep nesting.

## Decision
1. **Templates → text nodes only**: a ~20-line mustache-lite substitution (`{{key}}` → `String(value)`) rendered in JSX as a text child. No handlebars, no `dangerouslySetInnerHTML`, ever. Golden XSS fixtures for summaries, `preview_path`, alt, view-group patterns (`<img src=x onerror>`, `javascript:` values).
2. **`safePath()` on every read AND write** of media paths: must start with configured public prefix, reject `..`, backslashes, `%2f/%5c` decodings, drive letters, scheme prefixes. **`safeUrl()`**: protocol allowlist (http/https/relative) for `site_url`-derived links; `<a target=_blank rel="noopener noreferrer">`.
3. **SVG**: uploads REJECTED in v1 (canvas pipeline would rasterize → silently convert logos; passthrough = active content). Existing repo SVGs render only via `<img src=blob:>` (image-document context: no script exec). Inline `<svg>` of repo files, `object/embed/iframe` = banned sinks. Stage B may add SVG passthrough behind DOMPurify + allowlist ADR.
4. **`parseUntrustedJson()`** = the ONLY entry/config parse: re-keys prototype-free (strip `__proto__|constructor|prototype`); repo-wide CI ban on `Object.assign` + recursive merges on parsed structures; numeric surrogate keys string-prefixed everywhere.
5. **Resource caps**: entry ≤2MB, depth ≤64, list items ≤5k; upload pre-decode checks (file ≤15MB, naturalWidth/Height before canvas); render recursion guard. Tailwind: no inline styles / dynamic class names built from repo values (JIT silent no-op = not an XSS sink but a correctness trap); widgets emit closed-enum tokens.
6. Enforced by CI: biome lint rules + grep gates (zero `dangerouslySetInnerHTML|eval|new Function|innerHTML=`), golden fixtures, adversarial tests.

## Consequences
Any future rich summary/preview feature requires a NEW ADR with an allowlisted pipeline (DOMPurify-class) — the default is denial.
### P0 verification (2026-10-27)
- Enforced now: biome security rules (`noDangerouslySetInnerHtml`, `noGlobalEval`, `noBlankTarget`) + the e2e catch-all origin-allowlist assertion (INV-N05 run in the smoke) + Result-shaped guard utilities (no throwing on malformed read shapes) + CI scripts (workflow guard, prod-purity byte-scan). `parseUntrustedJson` lands with P1. No deviation.
