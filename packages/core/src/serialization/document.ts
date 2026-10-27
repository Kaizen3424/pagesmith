/**
 * Source-preserving JSON documents (ADR-0003 P1 addendum / INV-S01).
 *
 * Untouched documents return their original bytes — the yve corpus is
 * Prettier-shaped, so re-printing would create phantom diffs. Only edited or
 * new documents use the canonical printer (2-space, author key order, LF,
 * trailing newline).
 */
import type { JsonValue, UntrustedJsonIssue } from "../safety/untrusted-json"
import { parseUntrustedJson } from "../safety/untrusted-json"

export type NewlineStyle = "lf" | "crlf" | "none"

export interface JsonDocument {
  readonly raw: string
  readonly value: JsonValue
  readonly newline: NewlineStyle
  readonly strippedKeys: readonly string[]
}

export type ParseJsonDocumentResult =
  | { readonly ok: true; readonly document: JsonDocument }
  | { readonly ok: false; readonly issues: readonly UntrustedJsonIssue[] }

export function parseJsonDocument(raw: string): ParseJsonDocumentResult {
  const parsed = parseUntrustedJson(raw)
  if (!parsed.ok) return parsed
  return {
    ok: true,
    document: {
      raw,
      value: parsed.value,
      newline: detectNewline(raw),
      strippedKeys: parsed.strippedKeys,
    },
  }
}

/**
 * Returns original bytes when the value is unchanged; otherwise canonical JSON.
 * Callers must pass a JSON-safe value (parse output is).
 */
export function serializeDocument(document: JsonDocument, nextValue?: JsonValue): string {
  if (nextValue === undefined || jsonEqual(document.value, nextValue)) {
    return document.raw
  }
  return canonicalJson(nextValue)
}

export function canonicalJson(value: JsonValue): string {
  const text = JSON.stringify(value, null, 2)
  if (text === undefined) throw new Error("canonicalJson: value is not JSON-serializable")
  return `${text}\n`
}

export function detectNewline(raw: string): NewlineStyle {
  if (raw.includes("\r\n")) return "crlf"
  if (raw.includes("\n")) return "lf"
  return "none"
}

export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
}

/** Deep equality with author key order ignored (no-op saves keep original order). */
export function jsonEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
    return left.every((value, index) => jsonEqual(value, right[index]))
  }
  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    if (leftKeys.length !== rightKeys.length) return false
    for (const key of leftKeys) {
      if (!Object.hasOwn(right, key)) return false
      if (!jsonEqual(left[key], right[key])) return false
    }
    return true
  }
  return false
}

/** CRLF/format-insensitive canonical comparison used by no-op/ETag tests. */
export function documentsCanonicallyEqual(left: string, right: string): boolean {
  const parsedLeft = parseJsonDocument(left)
  const parsedRight = parseJsonDocument(right)
  return (
    parsedLeft.ok &&
    parsedRight.ok &&
    jsonEqual(parsedLeft.document.value, parsedRight.document.value)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
