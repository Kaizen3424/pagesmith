/**
 * Path guard — repo-relative paths and public media paths.
 *
 * Rules:
 *  - no control chars, no backslashes (Windows separators are a bypass vector),
 *  - no `..` segments, raw or percent-encoded (`%2e%2e`), no encoded separators,
 *  - no schemes/drive letters, no protocol-relative paths,
 *  - public paths require a leading `/`; repo paths forbid it,
 *  - optional prefix must match at a segment boundary (`/images-other` ≠ `/images`).
 */

export type SafePathFailureCode =
  | "EMPTY"
  | "CONTROL_CHAR"
  | "BACKSLASH"
  | "ABSOLUTE"
  | "SCHEME"
  | "EMPTY_SEGMENT"
  | "TRAVERSAL"
  | "ENCODED_SEPARATOR"
  | "ENCODED_TRAVERSAL"
  | "PREFIX_MISMATCH"
  | "INVALID_PREFIX"

export interface SafePathOptions {
  /** Required segment prefix, e.g. `/images` (public) or `src/content` (repo). */
  readonly prefix?: string
  /** true = public URL path (leading slash required); false = repo path (no leading slash). */
  readonly absolute?: boolean
}

export type SafePathResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly code: SafePathFailureCode; readonly detail?: string }

const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/
const ENCODED_SEPARATOR = /%2f|%5c/i
const PERCENT_DOT = /%2e/gi

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (code <= 0x1f || code === 0x7f) return true
  }
  return false
}

export function safePath(input: string, options: SafePathOptions = {}): SafePathResult {
  if (input.length === 0) return fail("EMPTY", "path is empty")
  if (hasControlCharacter(input)) return fail("CONTROL_CHAR", "control character")
  if (input.includes("\\")) return fail("BACKSLASH", "backslash separator")
  if (input !== input.trim()) return fail("CONTROL_CHAR", "leading/trailing whitespace")

  const absolute = options.absolute === true
  if (/^\/\//.test(input)) return fail("ABSOLUTE", "protocol-relative path")
  if (SCHEME.test(input)) return fail("SCHEME", "scheme or drive letter")
  if (ENCODED_SEPARATOR.test(input)) return fail("ENCODED_SEPARATOR", "encoded separator")

  if (absolute) {
    if (!input.startsWith("/")) return fail("ABSOLUTE", "public path must start with /")
  } else if (input.startsWith("/")) {
    return fail("ABSOLUTE", "repo path must be relative")
  }

  const body = absolute ? input.slice(1) : input
  const segments = body.split("/")
  for (const segment of segments) {
    if (segment.length === 0) return fail("EMPTY_SEGMENT", "empty path segment")
    if (segment === "." || segment === "..") return fail("TRAVERSAL", "dot segment")
    const dotDecoded = segment.replace(PERCENT_DOT, ".")
    if (dotDecoded === "." || dotDecoded === "..") {
      return fail("ENCODED_TRAVERSAL", "percent-encoded dot segment")
    }
  }

  const prefix = options.prefix
  if (prefix !== undefined) {
    const normalized = absolute && prefix.startsWith("/") ? prefix.slice(1) : prefix
    if (normalized.length === 0 || normalized.startsWith("/") || normalized.includes("\\")) {
      return fail("INVALID_PREFIX", "invalid prefix")
    }
    if (body !== normalized && !body.startsWith(`${normalized}/`)) {
      return fail("PREFIX_MISMATCH", `escapes prefix ${prefix}`)
    }
  }

  return { ok: true, value: input }
}

function fail(code: SafePathFailureCode, detail: string): SafePathResult {
  return { ok: false, code, detail }
}

export function isSafePath(input: string, options: SafePathOptions = {}): boolean {
  return safePath(input, options).ok
}
