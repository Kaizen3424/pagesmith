/**
 * Typed read errors (ADR-0005 P1 addendum). The admin maps these codes to
 * human prose; the transport never leaks response bodies or tokens.
 */
export type ReadErrorCode =
  | "AUTH_EXPIRED"
  | "SCOPE"
  | "NOT_FOUND"
  | "RATE_LIMIT"
  | "NETWORK"
  | "TREE_TRUNCATED"
  | "UNKNOWN"

export class BackendReadError extends Error {
  override readonly name = "BackendReadError"
  readonly code: ReadErrorCode
  readonly status?: number
  readonly retryAfter?: string

  constructor(
    code: ReadErrorCode,
    message: string,
    options: { status?: number; retryAfter?: string } = {},
  ) {
    super(message)
    this.code = code
    this.status = options.status
    this.retryAfter = options.retryAfter
  }
}

export function isBackendReadError(error: unknown): error is BackendReadError {
  return error instanceof BackendReadError
}
