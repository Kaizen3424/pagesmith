/** Auth seam — ADR-0002 (PAT-only v1; the OAuth Worker fills `AuthProvider` in Stage B). */

export type AuthKind = "pat" | "oauth-worker"

/**
 * Token lifecycle conditions (ADR-0002, encoding as interface law):
 * wipe on sign-out; wipe on 401 after failed re-probe; bootstrap =
 * restore → re-probe (failure ⇒ wipe + prompt); NEVER in URLs/queries;
 * sessionStorage fallback mode stays available per device.
 */
export interface AuthProvider {
  readonly kind: AuthKind
  /** Login-time capability probe — implementation lands in P1.8. */
  probe(): Promise<boolean>
}
