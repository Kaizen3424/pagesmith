/**
 * Untrusted JSON parse — ADR-0006 §4 (the ONLY entry/config parse).
 *
 * Repo content is untrusted input. This module:
 *  - refuses oversize input before parsing (entry ≤2MB),
 *  - re-keys the tree prototype-free, stripping `__proto__|constructor|prototype`
 *    at EVERY depth (no object spread/merge of parsed data),
 *  - enforces depth ≤64 and list ≤5k items,
 *  - returns a Result — malformed content must render, never throw.
 */

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue }

export const UNTRUSTED_JSON_LIMITS = {
  /** Entry cap from ADR-0006 §5. */
  maxBytes: 2 * 1024 * 1024,
  maxDepth: 64,
  maxListItems: 5_000,
} as const

export type UntrustedJsonFailureCode = "INVALID_JSON" | "TOO_LARGE" | "TOO_DEEP" | "TOO_MANY_ITEMS"

export interface UntrustedJsonIssue {
  readonly code: UntrustedJsonFailureCode
  /** Dot/bracket path of the offending value (`$` for the root). */
  readonly path?: string
  readonly detail?: string
}

export interface UntrustedJsonOptions {
  readonly maxBytes?: number
  readonly maxDepth?: number
  readonly maxListItems?: number
}

export type UntrustedJsonResult =
  | {
      readonly ok: true
      readonly value: JsonValue
      /** Paths whose dangerous keys were stripped (never rendered). */
      readonly strippedKeys: readonly string[]
    }
  | { readonly ok: false; readonly issues: readonly UntrustedJsonIssue[] }

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"])

/**
 * Parses untrusted JSON text. Never throws; failures are Result values.
 * Key insertion order is preserved (the serializer depends on author order).
 */
export function parseUntrustedJson(
  text: string,
  options: UntrustedJsonOptions = {},
): UntrustedJsonResult {
  const maxBytes = options.maxBytes ?? UNTRUSTED_JSON_LIMITS.maxBytes
  const maxDepth = options.maxDepth ?? UNTRUSTED_JSON_LIMITS.maxDepth
  const maxListItems = options.maxListItems ?? UNTRUSTED_JSON_LIMITS.maxListItems

  const bytes = utf8ByteLength(text)
  if (bytes > maxBytes) {
    return {
      ok: false,
      issues: [{ code: "TOO_LARGE", detail: `${bytes} bytes exceeds ${maxBytes}` }],
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return {
      ok: false,
      issues: [{ code: "INVALID_JSON", detail: errorMessage(error) }],
    }
  }

  const strippedKeys: string[] = []
  const rebuilt = rebuild(parsed, 1, "$", maxDepth, maxListItems, strippedKeys)
  if (!rebuilt.ok) return rebuilt
  return { ok: true, value: rebuilt.value, strippedKeys }
}

type RebuildResult =
  | { readonly ok: true; readonly value: JsonValue }
  | { readonly ok: false; readonly issues: readonly UntrustedJsonIssue[] }

function rebuild(
  value: unknown,
  depth: number,
  path: string,
  maxDepth: number,
  maxListItems: number,
  strippedKeys: string[],
): RebuildResult {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return { ok: true, value }
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return {
        ok: false,
        issues: [{ code: "INVALID_JSON", path, detail: "non-finite number" }],
      }
    }
    return { ok: true, value }
  }

  if (depth > maxDepth) {
    return { ok: false, issues: [{ code: "TOO_DEEP", path, detail: `depth ${depth}` }] }
  }

  if (Array.isArray(value)) {
    if (value.length > maxListItems) {
      return {
        ok: false,
        issues: [
          { code: "TOO_MANY_ITEMS", path, detail: `${value.length} items exceeds ${maxListItems}` },
        ],
      }
    }
    const items: JsonValue[] = []
    for (let index = 0; index < value.length; index += 1) {
      const item = rebuild(
        value[index],
        depth + 1,
        `${path}[${index}]`,
        maxDepth,
        maxListItems,
        strippedKeys,
      )
      if (!item.ok) return item
      items.push(item.value)
    }
    return { ok: true, value: items }
  }

  if (typeof value === "object") {
    const source = value as Record<string, unknown>
    const target: { [key: string]: JsonValue } = {}
    for (const key of Object.keys(source)) {
      const childPath = `${path}.${key}`
      if (DANGEROUS_KEYS.has(key)) {
        strippedKeys.push(childPath)
        continue
      }
      const child = rebuild(source[key], depth + 1, childPath, maxDepth, maxListItems, strippedKeys)
      if (!child.ok) return child
      // defineProperty avoids the `__proto__` setter even if a hostile key slips through.
      Object.defineProperty(target, key, {
        value: child.value,
        enumerable: true,
        configurable: true,
        writable: true,
      })
    }
    return { ok: true, value: target }
  }

  return {
    ok: false,
    issues: [{ code: "INVALID_JSON", path, detail: `unsupported type ${typeof value}` }],
  }
}

/** UTF-8 byte length without DOM/Node globals (core stays runtime-agnostic). */
export function utf8ByteLength(text: string): number {
  let bytes = 0
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (code <= 0x7f) bytes += 1
    else if (code <= 0x7ff) bytes += 2
    else if (code <= 0xffff) bytes += 3
    else bytes += 4
  }
  return bytes
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
