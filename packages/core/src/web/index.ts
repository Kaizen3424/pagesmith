/**
 * Node-safe seam — browser-only adapters (IndexedDB drafts, BroadcastChannel
 * lease, sessionStorage fallback) implement these INTERFACES; core never
 * imports their implementations (01-spec §5, ADR-0001).
 */
export interface WebKeyValueStore {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  delete(key: string): Promise<void>
}

export type { IdbTokenStoreOptions } from "./token-stores"
export { createIdbTokenStore, createSessionTokenStore } from "./token-stores"
