/**
 * PatProvider — ADR-0002 token lifecycle.
 *
 * A token lives in memory after a successful probe. Optional persistence is
 * explicit ("Remember on this device"); bootstrap = restore → re-probe and a
 * failed re-probe wipes the stored token before the login prompt. The token is
 * never placed in a URL, never logged, and never returned in UI state.
 */

import type { AuthProvider, TokenStore } from "./index"
import type { CapabilityProbeResult } from "./types"

export interface PatProviderOptions {
  readonly store: TokenStore
  readonly probe: (token: string) => Promise<CapabilityProbeResult>
}

export interface SignInOptions {
  readonly remember?: boolean
}

export class PatProvider implements AuthProvider {
  readonly kind = "pat" as const
  readonly #store: TokenStore
  readonly #probe: (token: string) => Promise<CapabilityProbeResult>
  #token: string | undefined
  #lastProbe: CapabilityProbeResult | undefined

  constructor(options: PatProviderOptions) {
    this.#store = options.store
    this.#probe = options.probe
  }

  get isSignedIn(): boolean {
    return this.#token !== undefined
  }

  get lastProbe(): CapabilityProbeResult | undefined {
    return this.#lastProbe
  }

  getToken(): string | undefined {
    return this.#token
  }

  async probe(): Promise<CapabilityProbeResult> {
    if (this.#token === undefined) throw new Error("not signed in")
    const result = await this.#probe(this.#token)
    this.#lastProbe = result
    return result
  }

  async signIn(token: string, options: SignInOptions = {}): Promise<CapabilityProbeResult> {
    const trimmed = token.trim()
    if (trimmed.length === 0) throw new Error("access key cannot be empty")
    try {
      const result = await this.#probe(trimmed)
      this.#token = trimmed
      this.#lastProbe = result
      if (options.remember === true) await this.#store.write(trimmed)
      else await this.#store.clear()
      return result
    } catch (error) {
      await this.#wipe()
      throw error
    }
  }

  /** Bootstrap: restore then re-probe; any failure wipes the persisted token. */
  async restore(): Promise<CapabilityProbeResult | undefined> {
    const stored = await this.#store.read()
    if (stored === undefined || stored.length === 0) return undefined
    try {
      const result = await this.#probe(stored)
      this.#token = stored
      this.#lastProbe = result
      return result
    } catch (error) {
      await this.#wipe()
      throw error
    }
  }

  /** Re-probe after a 401/403/422; failed re-probe wipes (INV-A03/INV-A04). */
  async reprobe(): Promise<CapabilityProbeResult> {
    if (this.#token === undefined) throw new Error("not signed in")
    try {
      const result = await this.#probe(this.#token)
      this.#lastProbe = result
      return result
    } catch (error) {
      await this.#wipe()
      throw error
    }
  }

  async signOut(): Promise<void> {
    await this.#wipe()
  }

  async #wipe(): Promise<void> {
    this.#token = undefined
    this.#lastProbe = undefined
    await this.#store.clear()
  }
}
