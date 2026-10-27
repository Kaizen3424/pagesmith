/** P0 placeholder admin config shape — replaced by the real config package types in P1. */

export interface AdminConfigPlaceholder {
  readonly schemaVersion: number
  readonly collections: readonly unknown[]
}

export interface SupportContext {
  /** The named human every founder-facing surface references — never "someone" (master-plan §7). */
  readonly name: string
}
