/** Auth seam — ADR-0002 (PAT-only v1; the OAuth Worker fills `AuthProvider` in Stage B). */
import type { CapabilityProbeResult } from "./types"

export type AuthKind = "pat" | "oauth-worker"

/**
 * Token lifecycle conditions (ADR-0002, encoding as interface law):
 * wipe on sign-out; wipe on 401 after failed re-probe; bootstrap =
 * restore → re-probe (failure ⇒ wipe + prompt); NEVER in URLs/queries;
 * sessionStorage fallback mode stays available per device.
 */
export interface AuthProvider {
  readonly kind: AuthKind
  /** Login-time capability probe. */
  probe(): Promise<CapabilityProbeResult>
  /** Only transport/composition code may read the token; never UI/logs. */
  getToken(): string | undefined
}

export interface TokenStore {
  read(): Promise<string | undefined>
  write(token: string): Promise<void>
  clear(): Promise<void>
}

/** Session-only fallback store (no persistence across cold starts). */
export class MemoryTokenStore implements TokenStore {
  #token: string | undefined

  async read(): Promise<string | undefined> {
    return this.#token
  }

  async write(token: string): Promise<void> {
    this.#token = token
  }

  async clear(): Promise<void> {
    this.#token = undefined
  }
}

export type { PatProviderOptions, SignInOptions } from "./pat-provider"
export { PatProvider } from "./pat-provider"
export type {
  CapabilityProbeResult,
  CapabilityStatus,
  ProbeErrorCode,
  RateLimitSnapshot,
} from "./types"
export { CapabilityProbeError } from "./types"
