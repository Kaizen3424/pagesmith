/** Capability-probe vocabulary (ADR-0002 / INV-A03 partial in P1). */

export type CapabilityStatus = "ok" | "missing" | "forbidden" | "error"

export interface RateLimitSnapshot {
  readonly limit: number
  readonly remaining: number
  /** ISO timestamp from GitHub's reset seconds. */
  readonly resetAt: string
}

export interface CapabilityProbeResult {
  readonly repo: CapabilityStatus
  readonly protectionAdmin: CapabilityStatus
  /** Advisory in P1: private repos often cannot read check-runs with a fine-grained PAT. */
  readonly checksRead: CapabilityStatus
  readonly rateLimit: RateLimitSnapshot | null
  /** Present when GitHub says the quota is exhausted; no requests may run in this window. */
  readonly quotaBlockedUntil?: string
}

export type ProbeErrorCode =
  | "AUTH_EXPIRED"
  | "SCOPE"
  | "NOT_FOUND"
  | "RATE_LIMIT"
  | "NETWORK"
  | "UNKNOWN"

export class CapabilityProbeError extends Error {
  override readonly name = "CapabilityProbeError"
  readonly code: ProbeErrorCode
  readonly status?: number
  readonly resetAt?: string

  constructor(
    code: ProbeErrorCode,
    message: string,
    options: { status?: number; resetAt?: string } = {},
  ) {
    super(message)
    this.code = code
    this.status = options.status
    this.resetAt = options.resetAt
  }
}
