/**
 * Lenient read parser (ADR-0003 §3): returns `{value, issues, untouched}`.
 * It NEVER throws on bad content and NEVER injects defaults — missing optional
 * keys stay missing, hidden defaults remain metadata for the new-entry fold.
 */

import type { MediaFolders } from "../config/types"
import { safePath } from "../safety/safe-path"
import { deriveSlug } from "../safety/slug"
import type { JsonValue } from "../safety/untrusted-json"
import type { FieldDescriptor } from "./types"

export type ParseIssueCode =
  | "TYPE_MISMATCH"
  | "MISSING_REQUIRED"
  | "INVALID_OPTION"
  | "OUT_OF_RANGE"
  | "PATTERN_MISMATCH"
  | "INVALID_DATE"
  | "INVALID_PATH"
  | "LIST_TOO_SHORT"
  | "LIST_TOO_LONG"
  | "VIRTUAL_KEY_IGNORED"
  | "UNMODELED_KEY"
  | "UNKNOWN_FIELD_TYPE"
  | "RELATION_UNKNOWN"
  | "RELATION_CHECK_FAILED"

export interface ParseIssue {
  readonly path: string
  readonly code: ParseIssueCode
  readonly message: string
  readonly severity: "error" | "warning"
}

export interface ParsedEntry {
  readonly value: Readonly<Record<string, unknown>>
  readonly issues: readonly ParseIssue[]
  /** JSON Pointer → raw value for keys the config does not model. */
  readonly untouched: Readonly<Record<string, JsonValue>>
}

export interface ParseEntryOptions {
  readonly fields: readonly FieldDescriptor[]
  readonly raw: unknown
  readonly filePath: string
  readonly media?: MediaFolders
}

interface ParseState {
  readonly issues: ParseIssue[]
  readonly untouched: Record<string, JsonValue>
  readonly filePath: string
  readonly media?: MediaFolders
}

export function parseEntry(options: ParseEntryOptions): ParsedEntry {
  const state: ParseState = {
    issues: [],
    untouched: {},
    filePath: options.filePath,
    media: options.media,
  }

  if (!isRecord(options.raw)) {
    return {
      value: {},
      issues: [
        {
          path: "",
          code: "TYPE_MISMATCH",
          message: "Entry must be a JSON object",
          severity: "error",
        },
      ],
      untouched: {},
    }
  }

  const value = parseFields(options.fields, options.raw, "", state, "")
  return { value, issues: state.issues, untouched: state.untouched }
}

function parseFields(
  fields: readonly FieldDescriptor[],
  raw: Readonly<Record<string, unknown>>,
  basePath: string,
  state: ParseState,
  basePointer: string,
): Record<string, unknown> {
  const value: Record<string, unknown> = {}
  const modeled = new Set<string>()

  for (const field of fields) {
    if (field.type === "divider") continue
    modeled.add(field.name)
    const path = joinPath(basePath, field.name)
    const pointer = joinPointer(basePointer, field.name)

    if (field.type === "slug") {
      const slug = deriveSlug(state.filePath)
      if (slug !== null) setOwn(value, field.name, slug)
      if (Object.hasOwn(raw, field.name)) {
        state.untouched[pointer] = toJson(raw[field.name])
        state.issues.push({
          path,
          code: "VIRTUAL_KEY_IGNORED",
          message: "Slug is virtual and derived from the filename",
          severity: "warning",
        })
      }
      continue
    }

    if (!Object.hasOwn(raw, field.name)) {
      if (field.required) {
        state.issues.push({
          path,
          code: "MISSING_REQUIRED",
          message: `${field.label} is required`,
          severity: "error",
        })
      }
      continue
    }

    const parsed = parseField(field, raw[field.name], path, state, pointer)
    setOwn(value, field.name, parsed)
  }

  for (const key of Object.keys(raw)) {
    if (modeled.has(key) || isDangerousKey(key)) continue
    state.untouched[joinPointer(basePointer, key)] = toJson(raw[key])
    state.issues.push({
      path: joinPath(basePath, key),
      code: "UNMODELED_KEY",
      message: `"${key}" is not part of this collection and will be preserved as-is`,
      severity: "warning",
    })
  }

  return value
}

function parseField(
  field: FieldDescriptor,
  raw: unknown,
  path: string,
  state: ParseState,
  pointer: string,
): unknown {
  switch (field.type) {
    case "string":
    case "text":
      if (typeof raw !== "string") return typeIssue(path, field.label, "text", raw, state)
      if (field.type === "string" && field.format === "email" && !isEmail(raw)) {
        state.issues.push({
          path,
          code: "PATTERN_MISMATCH",
          message: `${field.label} must be an email address`,
          severity: "error",
        })
      }
      if (field.type === "string" && field.format === "url" && !isHttpUrl(raw)) {
        state.issues.push({
          path,
          code: "PATTERN_MISMATCH",
          message: `${field.label} must be a URL`,
          severity: "error",
        })
      }
      if (field.minLength !== undefined && raw.length < field.minLength) {
        state.issues.push({
          path,
          code: "OUT_OF_RANGE",
          message: `${field.label} is shorter than ${field.minLength}`,
          severity: "error",
        })
      }
      if (field.maxLength !== undefined && raw.length > field.maxLength) {
        state.issues.push({
          path,
          code: "OUT_OF_RANGE",
          message: `${field.label} is longer than ${field.maxLength}`,
          severity: "error",
        })
      }
      if (field.type === "string" && field.pattern !== undefined) {
        try {
          if (!new RegExp(field.pattern).test(raw)) {
            state.issues.push({
              path,
              code: "PATTERN_MISMATCH",
              message: `${field.label} does not match the required pattern`,
              severity: "error",
            })
          }
        } catch {
          state.issues.push({
            path,
            code: "PATTERN_MISMATCH",
            message: `${field.label} has an invalid configured pattern`,
            severity: "error",
          })
        }
      }
      return raw
    case "number":
      if (typeof raw !== "number" || !Number.isFinite(raw)) {
        return typeIssue(path, field.label, "number", raw, state)
      }
      if (field.int === true && !Number.isInteger(raw)) {
        state.issues.push({
          path,
          code: "TYPE_MISMATCH",
          message: `${field.label} must be a whole number`,
          severity: "error",
        })
      }
      if (field.min !== undefined && raw < field.min) {
        state.issues.push({
          path,
          code: "OUT_OF_RANGE",
          message: `${field.label} must be at least ${field.min}`,
          severity: "error",
        })
      }
      if (field.max !== undefined && raw > field.max) {
        state.issues.push({
          path,
          code: "OUT_OF_RANGE",
          message: `${field.label} must be at most ${field.max}`,
          severity: "error",
        })
      }
      return raw
    case "boolean":
      return typeof raw === "boolean" ? raw : typeIssue(path, field.label, "boolean", raw, state)
    case "select":
      return parseSelect(field, raw, path, state)
    case "datetime":
      if (typeof raw !== "string") return typeIssue(path, field.label, "date", raw, state)
      if (!isDate(raw, field.dateOnly === true)) {
        state.issues.push({
          path,
          code: "INVALID_DATE",
          message: `${field.label} is not a valid ${field.dateOnly === true ? "date" : "date/time"}`,
          severity: "error",
        })
      }
      return raw
    case "image":
      if (typeof raw !== "string") return typeIssue(path, field.label, "image path", raw, state)
      if (!isImagePath(raw, state.media, field.extensions)) {
        state.issues.push({
          path,
          code: "INVALID_PATH",
          message: `${field.label} must be a media path under the public folder`,
          severity: "error",
        })
      }
      return raw
    case "relation":
      return parseRelation(field, raw, path, state)
    case "hidden":
      return raw
    case "list":
      return parseList(field, raw, path, state, pointer)
    case "object":
      if (!isRecord(raw)) return typeIssue(path, field.label, "object", raw, state)
      return parseFields(field.fields, raw, path, state, pointer)
    case "slug":
      return deriveSlug(state.filePath) ?? undefined
    case "divider":
      return undefined
    default:
      state.issues.push({
        path,
        code: "UNKNOWN_FIELD_TYPE",
        message: `Unknown field type ${(field as { type?: string }).type ?? "?"}`,
        severity: "error",
      })
      return raw
  }
}

function parseSelect(
  field: Extract<FieldDescriptor, { type: "select" }>,
  raw: unknown,
  path: string,
  state: ParseState,
): unknown {
  const values = new Set(field.options.map((option) => option.value))
  if (field.multiple === true) {
    if (!Array.isArray(raw)) return typeIssue(path, field.label, "list of choices", raw, state)
    for (const [index, item] of raw.entries()) {
      if (typeof item !== "string") {
        state.issues.push({
          path: `${path}[${index}]`,
          code: "TYPE_MISMATCH",
          message: `${field.label} must be text`,
          severity: "error",
        })
      } else if (!values.has(item)) {
        state.issues.push({
          path: `${path}[${index}]`,
          code: "INVALID_OPTION",
          message: `${field.label} has an unknown choice "${item}"`,
          severity: "error",
        })
      }
    }
    return raw
  }
  if (typeof raw !== "string") return typeIssue(path, field.label, "choice", raw, state)
  if (!values.has(raw)) {
    state.issues.push({
      path,
      code: "INVALID_OPTION",
      message: `${field.label} has an unknown choice "${raw}"`,
      severity: "error",
    })
  }
  return raw
}

function parseRelation(
  field: Extract<FieldDescriptor, { type: "relation" }>,
  raw: unknown,
  path: string,
  state: ParseState,
): unknown {
  if (field.multiple === true) {
    if (!Array.isArray(raw)) return typeIssue(path, field.label, "list of references", raw, state)
    for (const [index, item] of raw.entries()) {
      if (typeof item !== "string" || item.length === 0) {
        state.issues.push({
          path: `${path}[${index}]`,
          code: "TYPE_MISMATCH",
          message: `${field.label} must be a reference`,
          severity: "error",
        })
      }
    }
    return raw
  }
  if (typeof raw !== "string" || raw.length === 0) {
    return typeIssue(path, field.label, "reference", raw, state)
  }
  return raw
}

function parseList(
  field: Extract<FieldDescriptor, { type: "list" }>,
  raw: unknown,
  path: string,
  state: ParseState,
  pointer: string,
): unknown {
  if (!Array.isArray(raw)) return typeIssue(path, field.label, "list", raw, state)
  if (field.min !== undefined && raw.length < field.min) {
    state.issues.push({
      path,
      code: "LIST_TOO_SHORT",
      message: `${field.label} needs at least ${field.min} item${field.min === 1 ? "" : "s"}`,
      severity: "error",
    })
  }
  if (field.max !== undefined && raw.length > field.max) {
    state.issues.push({
      path,
      code: "LIST_TOO_LONG",
      message: `${field.label} allows at most ${field.max} item${field.max === 1 ? "" : "s"}`,
      severity: "error",
    })
  }

  const values: unknown[] = []
  raw.forEach((item, index) => {
    const itemPath = `${path}[${index}]`
    const itemPointer = joinPointer(pointer, String(index))
    if (field.itemMode === "scalar") {
      const child = field.fields[0]
      if (child === undefined || child.type === "divider") {
        values.push(item)
        return
      }
      values.push(parseField(child, item, itemPath, state, itemPointer))
      return
    }

    if (!isRecord(item)) {
      values.push(typeIssue(itemPath, field.label, "item", item, state))
      return
    }
    values.push(parseFields(field.fields, item, itemPath, state, itemPointer))
  })
  return values
}

function typeIssue(
  path: string,
  label: string,
  expected: string,
  raw: unknown,
  state: ParseState,
): unknown {
  state.issues.push({
    path,
    code: "TYPE_MISMATCH",
    message: `${label} must be ${expected}`,
    severity: "error",
  })
  return raw
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isDangerousKey(key: string): boolean {
  return key === "__proto__" || key === "constructor" || key === "prototype"
}

function setOwn(target: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  })
}

function joinPath(base: string, key: string): string {
  return base.length === 0 ? key : `${base}.${key}`
}

function joinPointer(base: string, token: string): string {
  const escaped = token.replace(/~/g, "~0").replace(/\//g, "~1")
  return `${base}/${escaped}`
}

function toJson(value: unknown): JsonValue {
  return value as JsonValue
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value)
}

function isDate(value: string, dateOnly: boolean): boolean {
  if (dateOnly) return /^\d{4}-\d{2}-\d{2}$/.test(value)
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
}

function isImagePath(
  value: string,
  media: MediaFolders | undefined,
  extensions?: readonly string[],
): boolean {
  const prefix = media?.publicFolder
  const result = safePath(value, { absolute: true, ...(prefix === undefined ? {} : { prefix }) })
  if (!result.ok) return false
  const allowed = extensions ?? ["jpg", "jpeg", "png", "webp", "avif", "svg"]
  const extension = /\.([A-Za-z0-9]+)$/.exec(value)?.[1]?.toLowerCase()
  return extension !== undefined && allowed.includes(extension)
}
