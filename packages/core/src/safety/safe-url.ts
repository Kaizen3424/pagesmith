/**
 * URL guard — preview/links may only be http(s) or same-origin relative paths.
 * `javascript:`, `data:`, `file:`, protocol-relative and control-char bypasses fail.
 */

export type SafeUrlFailureCode =
  | "EMPTY"
  | "CONTROL_CHAR"
  | "BACKSLASH"
  | "PROTOCOL_RELATIVE"
  | "UNSAFE_SCHEME"
  | "INVALID"

export interface SafeUrlOptions {
  /** Allow same-origin relative paths starting with a single `/` (default true). */
  readonly allowRelative?: boolean
}

export type SafeUrlResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly code: SafeUrlFailureCode; readonly detail?: string }

const ENCODED_CONTROL = /%0[0-9ad]|%1[0-9a-f]|%7f/i
const SCHEME = /^([a-zA-Z][a-zA-Z0-9+.-]*):/

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (code <= 0x1f || code === 0x7f) return true
  }
  return false
}

export function safeUrl(input: string, options: SafeUrlOptions = {}): SafeUrlResult {
  if (input.length === 0) return fail("EMPTY", "url is empty")
  if (hasControlCharacter(input) || ENCODED_CONTROL.test(input)) {
    return fail("CONTROL_CHAR", "control character")
  }
  if (input !== input.trim()) return fail("CONTROL_CHAR", "leading/trailing whitespace")
  if (input.includes("\\")) return fail("BACKSLASH", "backslash in url")
  if (input.startsWith("//")) return fail("PROTOCOL_RELATIVE", "protocol-relative url")

  const scheme = SCHEME.exec(input)
  if (scheme !== null) {
    const name = (scheme[1] ?? "").toLowerCase()
    if (name !== "http" && name !== "https") {
      return fail("UNSAFE_SCHEME", `scheme ${name}`)
    }
    const rest = input.slice(scheme[0].length)
    if (!/^\/\/[^\s/?#]+/.test(rest)) return fail("INVALID", "missing host")
    const authority = rest.slice(2).split(/[/?#]/, 1)[0] ?? ""
    if (authority.includes("@")) return fail("INVALID", "credentials in url")
    return { ok: true, value: input }
  }

  if (options.allowRelative === false) return fail("INVALID", "relative url not allowed")
  if (!input.startsWith("/")) return fail("INVALID", "relative url must start with /")
  return { ok: true, value: input }
}

function fail(code: SafeUrlFailureCode, detail: string): SafeUrlResult {
  return { ok: false, code, detail }
}

export function isSafeUrl(input: string, options: SafeUrlOptions = {}): boolean {
  return safeUrl(input, options).ok
}
