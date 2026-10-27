/**
 * Log masking + memory-only ring buffer — ADR-0002 §conditions, ADR-0009 §?,
 * INV-A05. Rules: mask classic credential KEYS (authorization/token/secret/
 * password and any `x-github-*` header) and re-mask value patterns
 * (github_pat_…, ghp_/gho_…, email addresses). The buffer is MEMORY-ONLY —
 * no persistence, no upload, ever (demonstrations surface it via a
 * user-initiated "copy diagnostics" action, never automatically).
 */

/** LogRecord stored in the ring buffer (already masked). */
export interface LogRecord {
  readonly level: LogLevel
  readonly message: string
  readonly data: unknown
  readonly at: string
}

export type LogLevel = "debug" | "info" | "warn" | "error"

/** Value-pattern masks applied to strings (messages and printed values). */
const VALUE_MASKS: readonly { pattern: RegExp; masked: string }[] = [
  { pattern: /github_pat_[A-Za-z0-9_]+/g, masked: "[token]" },
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, masked: "[token]" },
  { pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, masked: "[email]" },
]

const MASKED_KEY_VALUE = "[masked]"
const MAX_DATA_DEPTH = 8
const DEFAULT_RING_CAPACITY = 256

/** Key-level mask check — classic credential keys and every `x-github-*` header. */
export function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase()
  if (
    lower === "authorization" ||
    lower === "token" ||
    lower === "secret" ||
    lower === "password"
  ) {
    return true
  }
  return lower.startsWith("x-github-")
}

export function maskString(value: string): string {
  let masked = value
  for (const { pattern, masked: replacement } of VALUE_MASKS) {
    masked = masked.replace(pattern, replacement)
  }
  return masked
}

export function maskData(value: unknown, depth: number): unknown {
  if (depth > MAX_DATA_DEPTH) return "[depth-limit]"
  if (typeof value === "string") return maskString(value)
  if (value === null || typeof value !== "object") return value
  if (Array.isArray(value)) return value.map((item) => maskData(item, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [key, inner] of Object.entries(value)) {
    out[key] = isSensitiveKey(key) ? MASKED_KEY_VALUE : maskData(inner, depth + 1)
  }
  return out
}

export interface Logger {
  debug(message: string, data?: unknown): void
  info(message: string, data?: unknown): void
  warn(message: string, data?: unknown): void
  error(message: string, data?: unknown): void
  /** Snapshot of the ring buffer (oldest → newest). Memory-only by construction. */
  readonly history: readonly LogRecord[]
}

export function createLogger(capacity = DEFAULT_RING_CAPACITY): Logger {
  const ring: LogRecord[] = []
  const cap = Math.max(1, Math.floor(capacity))

  function append(level: LogLevel, message: string, data: unknown): void {
    const record = {
      level,
      message: maskString(message),
      data: data === undefined ? undefined : maskData(data, 0),
      at: new Date().toISOString(),
    }
    ring.push(record)
    if (ring.length > cap) ring.shift()
  }

  return {
    debug: (message, data) => append("debug", message, data),
    info: (message, data) => append("info", message, data),
    warn: (message, data) => append("warn", message, data),
    error: (message, data) => append("error", message, data),
    get history(): readonly LogRecord[] {
      return [...ring]
    },
  }
}
